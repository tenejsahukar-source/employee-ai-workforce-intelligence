"""
app/ml/artifacts/loader.py

ML Model Loader with XGBoost 3.x / SHAP compatibility hotfix.

Root cause (definitively confirmed across three iterations of logs)
--------------------------------------------------------------------
SHAP's XGBTreeModelLoader.__init__ always calls:

    raw = xgb_model.save_raw(raw_format="ubj")      # line ~2072
    jmodel = decode_ubjson_buffer(fd)                # UBJ parser
    ...
    self.base_score = float(learner_model_param["base_score"])  # CRASH

XGBoost 3.x serialises base_score as the bracketed string "[1.6156463E-1]"
inside the UBJ blob.  Older SHAP builds call float() on that string directly
and crash.  Newer SHAP builds (≥ 0.46-ish) use ast.literal_eval to handle it.

Why previous fixes failed
--------------------------
Attempt 1: save_config/load_config round-trip
  → Patches the booster's Python-visible JSON config, but XGBTreeModelLoader
    reads from save_raw(raw_format="ubj") which is a separate C++ code path
    that does NOT reflect the Python config patch.

Attempt 2: save_raw monkey-patch that redirects "ubj" → "json"
  → SHAP always calls decode_ubjson_buffer() on the bytes it gets back.
    Returning JSON text makes the UBJ parser choke on the '"' character
    ("Expected type size for b'\"' but could not find any.").

Attempt 3: same patch but override raw_format kwarg → "json"
  → Same outcome: SHAP still passes the return value to decode_ubjson_buffer.

The correct fix
---------------
Patch save_raw so that when called with raw_format="ubj" it returns
VALID UBJ bytes — but with base_score already replaced by a plain float
string that older SHAP can call float() on.

UBJ string encoding: S(0x53) + L(0x4C) + int64-big-endian-length + utf8-bytes

We do a direct binary patch:
  1. Locate the "base_score" key in the UBJ byte stream.
  2. Read the S + L + int64-BE-length + value layout.
  3. Replace "[1.6156463E-1]" (8 bytes) with "0.16156463" (10 bytes).
  4. Update the int64 length field accordingly.
  5. Return valid UBJ bytes that both the UBJ parser and float() accept.

This works regardless of SHAP version because we never change the binary
format — we only fix the value inside it.
"""

import io
import os
import json
import ast
import struct
import logging
from typing import Any, Dict, Optional

import joblib
import shap

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------

class ModelLoadError(Exception):
    """Raised when the ML pipeline or SHAP explainer cannot be initialised."""


# ---------------------------------------------------------------------------
# Module-level cache (never stores a failed load)
# ---------------------------------------------------------------------------

_ML_BUNDLE: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# XGBoost 3.x base_score UBJ binary patch
# ---------------------------------------------------------------------------

def _patch_ubj_base_score(raw: bytes) -> bytes:
    """
    Binary-patch XGBoost UBJ bytes to replace a bracketed base_score string
    with a plain float string that older SHAP builds can call float() on.

    XGBoost 3.x UBJ string layout for base_score:
        "base_score"  S(0x53)  L(0x4C)  <int64-BE length>  <utf8 value>

    Replaces "[1.6156463E-1]" (bracketed, 15 bytes) with "0.16156463"
    (plain float, 10 bytes) and updates the length field accordingly.

    The output is valid UBJ that decode_ubjson_buffer() accepts AND whose
    base_score value float() can parse — satisfying both old and new SHAP.
    """
    raw = bytearray(raw)
    key = b"base_score"
    idx = raw.find(key)
    if idx < 0:
        return bytes(raw)

    pos = idx + len(key)

    # Expect: S marker (0x53) + L marker (0x4C) + 8-byte big-endian int64 length
    if pos + 10 > len(raw):
        return bytes(raw)
    if raw[pos] != 0x53 or raw[pos + 1] != 0x4C:
        logger.debug(
            "base_score UBJ marker mismatch: got 0x%02x 0x%02x; skipping patch.",
            raw[pos], raw[pos + 1],
        )
        return bytes(raw)

    length = struct.unpack_from(">q", raw, pos + 2)[0]   # big-endian int64
    val_start = pos + 10
    val_end = val_start + length

    if val_end > len(raw):
        return bytes(raw)

    try:
        value_str = raw[val_start:val_end].decode("utf-8")
    except UnicodeDecodeError:
        return bytes(raw)

    logger.debug("base_score UBJ value: %r", value_str)

    if value_str.startswith("[") and value_str.endswith("]"):
        inner = value_str[1:-1]                    # strip brackets: "1.6156463E-1"
        fixed_str = str(float(inner))              # "0.16156463"
        fixed_bytes = fixed_str.encode("utf-8")
        new_len_bytes = struct.pack(">q", len(fixed_bytes))   # big-endian int64
        raw = (
            raw[:pos + 2]
            + bytearray(new_len_bytes)
            + bytearray(fixed_bytes)
            + raw[val_end:]
        )
        logger.debug("UBJ base_score patched: %r → %r", value_str, fixed_str)

    return bytes(raw)


def _unbracket_base_score_json(config_str: str) -> str:
    """
    Rewrite "[1.6156463E-1]" → "0.16156463" inside an XGBoost JSON config
    string.  Used for the secondary save_config / load_config sanitisation.
    """
    try:
        payload = json.loads(config_str)
        lmp = (
            payload
            .get("learner", {})
            .get("learner_model_param", {})
        )
        base_score = lmp.get("base_score")
        if isinstance(base_score, str) and base_score.startswith("["):
            inner = base_score[1:-1]
            lmp["base_score"] = str(float(inner))
            logger.debug(
                "JSON config base_score patched: %r → %r",
                base_score, lmp["base_score"],
            )
            return json.dumps(payload)
    except Exception as e:
        logger.warning("JSON config base_score patch failed (non-fatal): %s", e)
    return config_str


def _patch_booster_inplace(booster: Any) -> None:
    """
    Apply two complementary patches to the booster so that both SHAP code
    paths (save_raw UBJ and save_config JSON) return a base_score that
    float() can parse.

    PRIMARY — save_raw UBJ binary patch
    ------------------------------------
    Intercepts booster.save_raw(raw_format="ubj") — the call SHAP always
    makes inside XGBTreeModelLoader.__init__ — and binary-patches the UBJ
    bytes to replace the bracketed base_score string with a plain float
    string.  The output is still valid UBJ, so decode_ubjson_buffer()
    succeeds and float(base_score) succeeds in every SHAP version.

    SECONDARY — save_config / load_config JSON patch
    -------------------------------------------------
    Sanitises the booster's in-memory JSON config for any code path that
    reads config via save_config() (e.g. custom inspection code).
    Does NOT affect XGBTreeModelLoader since it only uses save_raw.
    """
    # ── PRIMARY: monkey-patch save_raw ──────────────────────────────────
    original_save_raw = booster.save_raw

    def patched_save_raw(*args, **kwargs):
        # Determine the requested format without changing it.
        # SHAP calls save_raw(raw_format="ubj"); we must keep that format
        # so the returned bytes pass through decode_ubjson_buffer correctly.
        # We NEVER redirect to "json" — that broke the UBJ parser.
        result = original_save_raw(*args, **kwargs)

        # Determine format: positional arg takes priority, then kwarg, else default.
        fmt = args[0] if args else kwargs.get("raw_format", "ubj")

        if fmt == "ubj":
            # Patch the UBJ bytes in-place.
            if isinstance(result, (bytes, bytearray)):
                try:
                    result = _patch_ubj_base_score(result)
                except Exception as e:
                    logger.warning("UBJ base_score patch failed (non-fatal): %s", e)
            elif isinstance(result, tuple):
                # XGBoost 3.x sometimes returns (format_str, bytes)
                fmt_tag, byte_data = result[0], result[1]
                try:
                    byte_data = _patch_ubj_base_score(byte_data)
                except Exception as e:
                    logger.warning("UBJ base_score patch failed (non-fatal): %s", e)
                result = (fmt_tag, byte_data)

        return result

    booster.save_raw = patched_save_raw
    logger.debug("save_raw UBJ patch applied to booster.")

    # ── SECONDARY: sanitise in-memory JSON config ────────────────────────
    try:
        raw_config = booster.save_config()
        clean_config = _unbracket_base_score_json(raw_config)
        if clean_config != raw_config:
            booster.load_config(clean_config)
            logger.info("XGBoost booster JSON config patched in-place (base_score fixed).")
        else:
            logger.debug("XGBoost booster JSON config: no base_score patch needed.")
    except Exception as e:
        logger.warning("Booster JSON config patch failed (non-fatal): %s", e)


# ---------------------------------------------------------------------------
# Bundle loader
# ---------------------------------------------------------------------------

def _load_bundle() -> Dict[str, Any]:
    """
    Loads the scikit-learn pipeline and initialises a SHAP TreeExplainer.
    """
    model_name = "attrition_model"

    model_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "../../../artifacts/attrition_model.joblib"
        )
    )

    logger.info("Loading ML pipeline from: %s", model_path)
    pipeline = joblib.load(model_path)

    # ── 1. Extract the final estimator (XGBClassifier) ──────────────────
    final_estimator = pipeline[-1]

    # ── 2. Identify preprocessor (all steps except the last) ────────────
    preprocessor = pipeline[:-1]

    # ── 3. Patch the native Booster BEFORE handing it to SHAP ───────────
    booster = final_estimator.get_booster()
    _patch_booster_inplace(booster)

    # ── 4. Build the SHAP explainer on the RAW BOOSTER ──────────────────
    # We pass the raw Booster, NOT the sklearn XGBClassifier wrapper.
    # XGBTreeModelLoader (inside TreeEnsemble.__init__) receives whatever
    # object we pass as self.original_model and calls save_raw(raw_format="ubj")
    # on it.  Our monkey-patch on the booster intercepts that call and
    # returns patched UBJ bytes, so the bracketed base_score never reaches
    # float() in any SHAP version.
    #
    # shap_explainer.py uses explainer.shap_values() (ndarray API) which
    # works correctly with a raw-booster TreeExplainer.
    logger.info("Initialising SHAP TreeExplainer on raw booster…")
    try:
        explainer = shap.TreeExplainer(booster)
        logger.info("SHAP TreeExplainer ready.")
    except Exception as e:
        logger.error(
            "SHAP TreeExplainer init failed: %s — SHAP explanations will be unavailable.",
            e,
            exc_info=True,
        )
        explainer = None

    return {
        "model": pipeline,
        "preprocessor": preprocessor,
        "estimator": final_estimator,
        "explainer": explainer,
        "model_name": model_name,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_attrition_model() -> Dict[str, Any]:
    """
    Returns the cached ML bundle, loading it on first call.

    Why not @lru_cache?
    -------------------
    @lru_cache caches *exceptions* on some CPython builds — if the first
    call raises, every subsequent call raises the cached exception without
    retrying.  We avoid that by using a plain module-level variable that is
    only written on success.

    Bundle keys
    -----------
    model        – full sklearn Pipeline (preprocessor + estimator)
    preprocessor – pipeline[:-1] sub-Pipeline (preprocessing steps only)
    estimator    – pipeline[-1]  XGBClassifier
    explainer    – shap.TreeExplainer or None if init failed
    model_name   – str identifier
    """
    global _ML_BUNDLE

    if _ML_BUNDLE is None:
        try:
            _ML_BUNDLE = _load_bundle()
        except ModelLoadError:
            raise
        except Exception as exc:
            raise ModelLoadError(
                f"Failed to load model or SHAP explainer: {exc}"
            ) from exc

    return _ML_BUNDLE


def get_ml_bundle() -> Dict[str, Any]:
    """
    FastAPI dependency wrapper.

    Usage in a route:
        ml_bundle: dict = Depends(get_ml_bundle)

    Raises ModelLoadError (→ HTTPException 503) if the bundle never loaded.
    """
    return load_attrition_model()
