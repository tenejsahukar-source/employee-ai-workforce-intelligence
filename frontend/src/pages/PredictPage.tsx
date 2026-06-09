/**
 * PredictPage.tsx
 *
 * PRODUCTION VERSION — all hardcoded results removed.
 * Submits real employee feature data to POST /api/v1/predict/attrition
 * and displays the live XGBoost inference result including SHAP values.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Brain,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Loader2,
  ChevronRight,
  Zap,
  BarChart3,
  Info,
  User,
  DollarSign,
  Clock,
  Star,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  predictAttrition,
  type PredictionRequest,
  type PredictionResponse,
  type Department,
  type OvertimeStatus,
} from '@/services/predictionApi';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface FormState {
  employee_id: string;
  age: string;
  daily_rate: string;
  monthly_income: string;
  percent_salary_hike: string;
  distance_from_home: string;
  years_at_company: string;
  job_satisfaction: string;
  work_life_balance: string;
  over_time: OvertimeStatus;
  department: Department;
  job_level: string;
  environment_satisfaction: string;
  job_involvement: string;
  performance_rating: string;
  relationship_satisfaction: string;
}

const INITIAL_FORM: FormState = {
  employee_id: '',
  age: '',
  daily_rate: '',
  monthly_income: '',
  percent_salary_hike: '',
  distance_from_home: '',
  years_at_company: '',
  job_satisfaction: '3',
  work_life_balance: '3',
  over_time: 'No',
  department: 'engineering',
  job_level: '2',
  environment_satisfaction: '3',
  job_involvement: '3',
  performance_rating: '3',
  relationship_satisfaction: '3',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getRiskLevel(confidence: number): {
  label: string;
  color: string;
  bg: string;
  glow: string;
  icon: React.ReactNode;
} {
  if (confidence >= 0.7)
    return {
      label: 'High Risk',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      glow: 'shadow-rose-500/20',
      icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
    };
  if (confidence >= 0.4)
    return {
      label: 'Medium Risk',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      glow: 'shadow-amber-500/20',
      icon: <Activity className="w-5 h-5 text-amber-400" />,
    };
  return {
    label: 'Low Risk',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    glow: 'shadow-emerald-500/20',
    icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
  };
}

function parseError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('; ');
    return error.message;
  }
  return 'An unexpected error occurred. Check the console for details.';
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
        {icon}
      </div>
      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">{title}</h3>
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
        {label}
        {hint && (
          <span title={hint}>
            <Info className="w-3 h-3 text-slate-600 cursor-help" />
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-medium placeholder:text-white/20 focus:outline-none focus:bg-white/8 focus:border-indigo-500/60 transition-all';

const selectClass =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-indigo-500/60 transition-all appearance-none cursor-pointer';

/** 1–4 scale rating selector */
function RatingSelect({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  name: string;
}) {
  return (
    <select name={name} value={value} onChange={onChange} className={selectClass}>
      <option value="1">1 — Very Low</option>
      <option value="2">2 — Low</option>
      <option value="3">3 — Medium</option>
      <option value="4">4 — High</option>
    </select>
  );
}

/** SHAP waterfall mini-chart */
function ShapExplainer({ shap_values }: { shap_values: Record<string, number> }) {
  const sorted = Object.entries(shap_values)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 10);

  const maxAbs = Math.max(...sorted.map(([, v]) => Math.abs(v)), 0.001);

  return (
    <div className="space-y-3">
      {sorted.map(([feature, value]) => {
        const isPositive = value > 0; // positive SHAP = pushes toward attrition
        const pct = Math.abs(value / maxAbs) * 100;
        return (
          <div key={feature} className="flex items-center gap-4">
            <span className="w-44 text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate shrink-0">
              {feature.replace(/_/g, ' ')}
            </span>
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={cn(
                  'h-full rounded-full',
                  isPositive
                    ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]'
                    : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                )}
              />
            </div>
            <span
              className={cn(
                'w-14 text-right text-[10px] font-black font-mono',
                isPositive ? 'text-rose-400' : 'text-emerald-400'
              )}
            >
              {value > 0 ? '+' : ''}
              {value.toFixed(3)}
            </span>
          </div>
        );
      })}
      <p className="text-[9px] text-slate-600 pt-2">
        <span className="text-rose-400">■</span> Increases attrition risk &nbsp;
        <span className="text-emerald-400">■</span> Decreases attrition risk
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function PredictPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Form helpers ───────────────────────────────────────────────────────────

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
      // Clear any previous error when user edits the form
      if (error) setError(null);
    },
    [error]
  );

  // ── Build typed payload from string form state ─────────────────────────────

  const buildPayload = (): PredictionRequest => ({
    employee_id: parseInt(form.employee_id, 10),
    age: parseInt(form.age, 10),
    daily_rate: parseFloat(form.daily_rate),
    monthly_income: parseFloat(form.monthly_income),
    percent_salary_hike: parseFloat(form.percent_salary_hike),
    distance_from_home: parseFloat(form.distance_from_home),
    years_at_company: parseInt(form.years_at_company, 10),
    job_satisfaction: parseInt(form.job_satisfaction, 10),
    work_life_balance: parseInt(form.work_life_balance, 10),
    over_time: form.over_time,
    department: form.department,
    job_level: parseInt(form.job_level, 10),
    environment_satisfaction: parseInt(form.environment_satisfaction, 10),
    job_involvement: parseInt(form.job_involvement, 10),
    performance_rating: parseInt(form.performance_rating, 10),
    relationship_satisfaction: parseInt(form.relationship_satisfaction, 10),
  });

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const payload = buildPayload();
      const data = await predictAttrition(payload);
      setResult(data);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const riskInfo = result ? getRiskLevel(result.confidence) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className="relative space-y-10 pb-24"
    >
      {/* Atmosphere */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* ── Header ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-[2px] bg-indigo-500 rounded-full" />
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">
            Live Inference Engine
          </span>
        </div>
        <h1 className="text-5xl font-display font-bold text-white tracking-tight leading-none uppercase">
          Attrition Prediction
        </h1>
        <p className="text-slate-400 font-medium text-lg max-w-2xl">
          Enter employee profile data below. The XGBoost model will compute a
          real-time attrition risk score with SHAP-based explanations.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
        {/* ══════════════════════════════════════
            LEFT: Input form (3/5 width)
        ══════════════════════════════════════ */}
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-3 bg-white/[0.03] border border-white/8 rounded-3xl overflow-hidden premium-shadow-lg"
        >
          <div className="p-8 border-b border-white/5">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">
              Employee Profile Input
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              All fields are required. Values must match backend validation constraints.
            </p>
          </div>

          <div className="p-8 space-y-10">
            {/* ── Identity ── */}
            <section>
              <SectionHeader icon={<User className="w-4 h-4" />} title="Identity" />
              <div className="grid grid-cols-2 gap-5">
                <FormField label="Employee ID" hint="Positive integer, must exist in your HR system">
                  <input
                    type="number"
                    name="employee_id"
                    value={form.employee_id}
                    onChange={handleChange}
                    required
                    min={1}
                    placeholder="e.g. 1045"
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Age" hint="18–100 years">
                  <input
                    type="number"
                    name="age"
                    value={form.age}
                    onChange={handleChange}
                    required
                    min={18}
                    max={100}
                    placeholder="e.g. 34"
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Department">
                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="engineering">Engineering</option>
                    <option value="sales">Sales</option>
                    <option value="hr">Human Resources</option>
                    <option value="finance">Finance</option>
                    <option value="operations">Operations</option>
                  </select>
                </FormField>
                <FormField label="Job Level" hint="1 (entry) → 5 (executive)">
                  <select
                    name="job_level"
                    value={form.job_level}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    {[1, 2, 3, 4, 5].map((l) => (
                      <option key={l} value={l}>
                        Level {l}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </section>

            {/* ── Compensation ── */}
            <section>
              <SectionHeader icon={<DollarSign className="w-4 h-4" />} title="Compensation" />
              <div className="grid grid-cols-2 gap-5">
                <FormField label="Daily Rate (USD)">
                  <input
                    type="number"
                    name="daily_rate"
                    value={form.daily_rate}
                    onChange={handleChange}
                    required
                    min={1}
                    step="0.01"
                    placeholder="e.g. 800"
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Monthly Income (USD)">
                  <input
                    type="number"
                    name="monthly_income"
                    value={form.monthly_income}
                    onChange={handleChange}
                    required
                    min={1}
                    step="0.01"
                    placeholder="e.g. 6500"
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Salary Hike %" hint="Last performance cycle raise percentage">
                  <input
                    type="number"
                    name="percent_salary_hike"
                    value={form.percent_salary_hike}
                    onChange={handleChange}
                    required
                    min={0}
                    step="0.1"
                    placeholder="e.g. 15"
                    className={inputClass}
                  />
                </FormField>
              </div>
            </section>

            {/* ── Tenure & Logistics ── */}
            <section>
              <SectionHeader icon={<Clock className="w-4 h-4" />} title="Tenure & Logistics" />
              <div className="grid grid-cols-2 gap-5">
                <FormField label="Years at Company">
                  <input
                    type="number"
                    name="years_at_company"
                    value={form.years_at_company}
                    onChange={handleChange}
                    required
                    min={0}
                    placeholder="e.g. 5"
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Distance from Home" hint="Miles or km to office">
                  <input
                    type="number"
                    name="distance_from_home"
                    value={form.distance_from_home}
                    onChange={handleChange}
                    required
                    min={0}
                    step="0.1"
                    placeholder="e.g. 12"
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Works Overtime?">
                  <select
                    name="over_time"
                    value={form.over_time}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </FormField>
              </div>
            </section>

            {/* ── Satisfaction Ratings ── */}
            <section>
              <SectionHeader icon={<Star className="w-4 h-4" />} title="Satisfaction & Engagement (1–4)" />
              <div className="grid grid-cols-2 gap-5">
                {(
                  [
                    ['job_satisfaction', 'Job Satisfaction', 'How satisfied is the employee with their role?'],
                    ['work_life_balance', 'Work-Life Balance', 'Self-reported work/life balance score'],
                    ['environment_satisfaction', 'Environment Satisfaction', 'Workplace environment rating'],
                    ['job_involvement', 'Job Involvement', 'Degree of involvement in day-to-day work'],
                    ['performance_rating', 'Performance Rating', 'Last formal performance review score'],
                    ['relationship_satisfaction', 'Relationship Satisfaction', 'Quality of workplace relationships'],
                  ] as [keyof FormState, string, string][]
                ).map(([field, label, hint]) => (
                  <FormField key={field} label={label} hint={hint}>
                    <RatingSelect
                      name={field}
                      value={form[field] as string}
                      onChange={handleChange}
                    />
                  </FormField>
                ))}
              </div>
            </section>
          </div>

          {/* Submit */}
          <div className="px-8 pb-8">
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full flex items-center justify-center gap-3 py-4 rounded-2xl',
                'text-[11px] font-black uppercase tracking-widest transition-all',
                'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30',
                'hover:bg-indigo-500 hover:scale-[1.01] active:scale-[0.99]',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running XGBoost Inference…
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  Run Attrition Prediction
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* ══════════════════════════════════════
            RIGHT: Results panel (2/5 width)
        ══════════════════════════════════════ */}
        <div className="xl:col-span-2 space-y-6 sticky top-8">
          <AnimatePresence mode="wait">
            {/* ── Idle placeholder ── */}
            {!isLoading && !result && !error && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white/[0.02] border border-white/8 rounded-3xl p-10 flex flex-col items-center justify-center gap-6 text-center min-h-[300px]"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-indigo-400 opacity-60" />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    Awaiting Input
                  </p>
                  <p className="text-xs text-slate-600">
                    Complete the form and submit to run a live XGBoost attrition inference.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Loading spinner ── */}
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white/[0.02] border border-white/8 rounded-3xl p-10 flex flex-col items-center justify-center gap-6 min-h-[300px]"
              >
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                  <div className="absolute inset-0 rounded-full border-t-2 border-indigo-400 animate-spin" />
                  <Brain className="absolute inset-0 m-auto w-6 h-6 text-indigo-400" />
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">
                    Inference In Progress
                  </p>
                  <p className="text-xs text-slate-600">XGBoost model is running…</p>
                </div>
              </motion.div>
            )}

            {/* ── Error state ── */}
            {!isLoading && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-8 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <h3 className="text-[11px] font-black text-rose-400 uppercase tracking-widest">
                    Inference Failed
                  </h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{error}</p>
                <p className="text-[10px] text-slate-600">
                  Check the browser console for full error details and request payload.
                </p>
              </motion.div>
            )}

            {/* ── Success result ── */}
            {!isLoading && result && riskInfo && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="space-y-6"
              >
                {/* Risk Score Card */}
                <div
                  className={cn(
                    'rounded-3xl border p-8 space-y-6',
                    riskInfo.bg,
                    'shadow-2xl',
                    riskInfo.glow
                  )}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {riskInfo.icon}
                      <span className={cn('text-[11px] font-black uppercase tracking-widest', riskInfo.color)}>
                        {riskInfo.label}
                      </span>
                    </div>
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest font-mono">
                      {result.prediction === 1 ? 'ATTRITION' : 'RETAINED'}
                    </span>
                  </div>

                  {/* Big Score */}
                  <div className="flex items-end gap-3">
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                      className={cn('text-7xl font-display font-bold leading-none tracking-tighter', riskInfo.color)}
                    >
                      {(result.confidence * 100).toFixed(1)}
                    </motion.span>
                    <span className="text-2xl text-white/30 mb-2">%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.confidence * 100}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                      className={cn(
                        'h-full rounded-full',
                        result.confidence >= 0.7
                          ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                          : result.confidence >= 0.4
                          ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                          : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                      )}
                    />
                  </div>

                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                    <div>
                      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">
                        Model
                      </p>
                      <p className="text-[11px] font-bold text-white/60 font-mono truncate">
                        {result.model_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">
                        Trace ID
                      </p>
                      <p className="text-[11px] font-bold text-indigo-400/60 font-mono truncate">
                        {result.prediction_id.split('-')[0].toUpperCase()}…
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">
                        Outcome
                      </p>
                      <p className={cn('text-[11px] font-bold', riskInfo.color)}>
                        {result.prediction === 1 ? 'Will Likely Leave' : 'Likely to Stay'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">
                        Timestamp
                      </p>
                      <p className="text-[11px] font-bold text-white/40 font-mono">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SHAP Explainability */}
                {result.shap_values && Object.keys(result.shap_values).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/[0.02] border border-white/8 rounded-3xl p-8"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <BarChart3 className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        SHAP Feature Impact
                      </h3>
                    </div>
                    <ShapExplainer shap_values={result.shap_values} />
                  </motion.div>
                )}

                {/* Save confirmation */}
                <div className="flex items-center gap-3 px-5 py-4 bg-white/[0.02] border border-white/8 rounded-2xl">
                  <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-[10px] text-slate-500">
                    Prediction saved to PostgreSQL.{' '}
                    <span className="text-emerald-400 font-bold">View in History →</span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
