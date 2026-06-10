/**
 * src/components/UploadEmployeeModal.tsx
 *
 * Enterprise drag-and-drop CSV/XLSX bulk employee upload modal.
 * Features: file validation, upload progress, polling for processing status,
 * per-row error reporting, success summary — all connected to FastAPI.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, FileText, CheckCircle2, AlertTriangle,
  Loader2, CloudUpload, FileSpreadsheet,
} from 'lucide-react';
import {
  uploadEmployeeFile,
  getUploadProgress,
  type BulkUploadResponse,
  type UploadValidationError,
} from '@/services/employeeService';
import { useEmployees } from '@/context/EmployeeContext';
import { cn } from '@/utils/cn';

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

const ACCEPTED = ['.csv', '.xlsx', '.xls'];
const MAX_MB   = 10;
const POLL_MS  = 1500;

// ─────────────────────────────────────────────────────────────────────────────

export function UploadEmployeeModal({ open, onClose }: Props) {
  const { refetch } = useEmployees();

  const [file, setFile]               = useState<File | null>(null);
  const [phase, setPhase]             = useState<Phase>('idle');
  const [uploadPct, setUploadPct]     = useState(0);
  const [processPct, setProcessPct]   = useState(0);
  const [jobId, setJobId]             = useState<string | null>(null);
  const [result, setResult]           = useState<BulkUploadResponse | null>(null);
  const [errors, setErrors]           = useState<UploadValidationError[]>([]);
  const [dragOver, setDragOver]       = useState(false);
  const [fileError, setFileError]     = useState<string | null>(null);

  const inputRef   = useRef<HTMLInputElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setFile(null); setPhase('idle'); setUploadPct(0); setProcessPct(0);
      setJobId(null); setResult(null); setErrors([]); setFileError(null);
    }
  }, [open]);

  // Poll processing progress
  const startPolling = useCallback((id: string) => {
    console.log('[UploadModal] Starting progress poll for job:', id);
    pollRef.current = setInterval(async () => {
      try {
        const prog = await getUploadProgress(id);
        console.log('[UploadModal] Poll:', prog);
        setProcessPct(prog.progress);
        if (prog.errors.length) setErrors(prog.errors);
        if (prog.status === 'done' || prog.status === 'failed') {
          clearInterval(pollRef.current!);
          setPhase(prog.status === 'done' ? 'done' : 'error');
          if (prog.status === 'done') refetch(); // refresh EmployeeContext
        }
      } catch (e) {
        console.error('[UploadModal] Poll error:', e);
      }
    }, POLL_MS);
  }, [refetch]);

  const validateFile = (f: File): string | null => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) return `Unsupported format. Upload a CSV, XLSX, or XLS file.`;
    if (f.size > MAX_MB * 1024 * 1024) return `File too large. Maximum is ${MAX_MB} MB.`;
    return null;
  };

  const handleFile = useCallback((f: File) => {
    const err = validateFile(f);
    if (err) { setFileError(err); return; }
    setFileError(null);
    setFile(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setPhase('uploading');
    setUploadPct(0);
    console.group('[UploadModal] Starting upload');
    console.log('File:', file.name);

    try {
      const res = await uploadEmployeeFile(file, (pct) => {
        setUploadPct(pct);
        if (pct === 100) { setPhase('processing'); setProcessPct(0); }
      });

      console.log('[UploadModal] Upload complete:', res);
      setResult(res);
      setJobId(res.job_id);

      // If errors already returned synchronously
      if (res.errors?.length) setErrors(res.errors);

      // Backend may process asynchronously; poll for status
      if (res.job_id) {
        startPolling(res.job_id);
      } else {
        // Synchronous response — done immediately
        setPhase('done');
        refetch();
      }
    } catch (e: any) {
      console.error('[UploadModal] Upload failed:', e);
      setErrors([{ row: 0, field: 'file', message: e?.response?.data?.detail ?? e?.message ?? 'Upload failed. Please try again.' }]);
      setPhase('error');
    } finally {
      console.groupEnd();
    }
  };

  const isXlsx = file?.name.endsWith('.xlsx') || file?.name.endsWith('.xls');
  const FileIcon = isXlsx ? FileSpreadsheet : FileText;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => phase !== 'uploading' && phase !== 'processing' && onClose()}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-lg bg-[#0b0d18] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-7 pt-7 pb-5 border-b border-white/5 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-display font-bold text-white tracking-tight">
                    Import Employee Dataset
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload a CSV or XLSX file to bulk-import employees into PostgreSQL.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  disabled={phase === 'uploading' || phase === 'processing'}
                  className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all disabled:opacity-30"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-7 space-y-5">
                {/* ── IDLE / FILE SELECTED ── */}
                {(phase === 'idle') && (
                  <>
                    {/* Drop zone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => inputRef.current?.click()}
                      className={cn(
                        'relative cursor-pointer border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 transition-all',
                        dragOver
                          ? 'border-indigo-500/60 bg-indigo-500/5'
                          : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                      )}
                    >
                      <div className={cn('p-3 rounded-2xl transition-colors', dragOver ? 'bg-indigo-500/15' : 'bg-white/5')}>
                        <CloudUpload className={cn('w-8 h-8 transition-colors', dragOver ? 'text-indigo-400' : 'text-slate-500')} />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-semibold text-white/80">
                          Drop your file here, or <span className="text-indigo-400">browse</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          CSV, XLSX, XLS · Max {MAX_MB} MB
                        </p>
                      </div>
                      <input
                        ref={inputRef}
                        type="file"
                        accept={ACCEPTED.join(',')}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                    </div>

                    {fileError && (
                      <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {fileError}
                      </div>
                    )}

                    {/* Selected file preview */}
                    {file && !fileError && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 px-4 py-3 bg-white/[0.04] border border-white/8 rounded-xl"
                      >
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                          <FileIcon className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {(file.size / 1024).toFixed(1)} KB · {isXlsx ? 'Excel Workbook' : 'CSV'}
                          </p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setFile(null); }}
                          className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )}

                    {/* Expected columns hint */}
                    <div className="px-4 py-3 bg-white/[0.025] border border-white/5 rounded-xl">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                        Required Columns
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
                        name, role, dept, email, age, tenure, manager, over_time, department, job_level, monthly_income, years_at_company, job_satisfaction, work_life_balance
                      </p>
                    </div>
                  </>
                )}

                {/* ── UPLOADING ── */}
                {phase === 'uploading' && (
                  <div className="space-y-4 py-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                      <span className="text-sm font-semibold text-white">Uploading file…</span>
                      <span className="ml-auto text-sm font-black text-indigo-400 tabular-nums">{uploadPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${uploadPct}%` }}
                        transition={{ ease: 'easeOut' }}
                        className="h-full bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {file?.name} · {(file?.size ?? 0 / 1024).toFixed(1)} KB
                    </p>
                  </div>
                )}

                {/* ── PROCESSING ── */}
                {phase === 'processing' && (
                  <div className="space-y-4 py-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                      <span className="text-sm font-semibold text-white">Processing rows…</span>
                      <span className="ml-auto text-sm font-black text-cyan-400 tabular-nums">{processPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${processPct}%` }}
                        transition={{ ease: 'easeOut' }}
                        className="h-full bg-cyan-500 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.4)]"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Validating and inserting employee records into PostgreSQL…
                    </p>
                  </div>
                )}

                {/* ── DONE ── */}
                {phase === 'done' && result && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="text-sm font-semibold text-emerald-300">Import complete</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Inserted',  value: result.inserted, color: 'text-emerald-400' },
                        { label: 'Updated',   value: result.updated,  color: 'text-indigo-400'  },
                        { label: 'Skipped',   value: result.skipped,  color: 'text-amber-400'   },
                      ].map(s => (
                        <div key={s.label} className="text-center p-4 bg-white/[0.03] border border-white/5 rounded-xl">
                          <p className={cn('text-2xl font-display font-bold tabular-nums', s.color)}>{s.value}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {errors.length > 0 && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                        <div className="px-4 py-3 flex items-center gap-2 border-b border-amber-500/10">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
                            {errors.length} row {errors.length === 1 ? 'error' : 'errors'}
                          </span>
                        </div>
                        <div className="max-h-36 overflow-y-auto divide-y divide-white/5">
                          {errors.slice(0, 20).map((e, i) => (
                            <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                              <span className="text-[10px] font-black text-slate-500 tabular-nums w-10 shrink-0">
                                Row {e.row}
                              </span>
                              <span className="text-[10px] text-amber-300/80 font-medium flex-1">{e.message}</span>
                            </div>
                          ))}
                          {errors.length > 20 && (
                            <p className="px-4 py-2 text-[10px] text-slate-500">
                              +{errors.length - 20} more errors — download the error report for full details.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── ERROR ── */}
                {phase === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="text-sm font-semibold text-rose-300">Upload failed</span>
                    </div>
                    {errors.map((e, i) => (
                      <p key={i} className="text-xs text-slate-400 px-1">
                        {e.row > 0 ? `Row ${e.row}: ` : ''}{e.message}
                      </p>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Footer actions */}
              <div className="px-7 pb-7 pt-2 flex items-center justify-end gap-3 border-t border-white/5 mt-2">
                {phase === 'idle' && (
                  <>
                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={!file || !!fileError}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import
                    </button>
                  </>
                )}

                {(phase === 'done' || phase === 'error') && (
                  <>
                    {phase === 'error' && (
                      <button
                        onClick={() => { setPhase('idle'); setFile(null); setErrors([]); }}
                        className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                      >
                        Try Again
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/25"
                    >
                      {phase === 'done' ? 'Done' : 'Close'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
