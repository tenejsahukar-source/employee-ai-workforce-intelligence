/**
 * src/pages/DashboardPage.tsx
 *
 * AetherIQ — Workforce Intelligence Dashboard
 * All analytics fetched from FastAPI / PostgreSQL via React Query.
 * Zero mock data. Framer Motion entrance animations preserved.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Users, Zap, ArrowUpRight,
  ChevronRight, FileText, Loader2, AlertTriangle,
  RefreshCw, Upload, ShieldAlert, Activity,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui/Layout';
import { cn } from '@/utils/cn';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
  PieChart, Pie,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useOverview, useRiskDistribution, useDepartments, useHighRiskEmployees, useTrends } from '@/hooks/useDashboard';
import { UploadEmployeeModal } from '@/components/UploadEmployeeModal';

// ─── Recharts custom tooltip ─────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#07080f]/95 border border-white/10 backdrop-blur-xl p-3 rounded-xl shadow-2xl min-w-[140px]">
      <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em] mb-2">{label}</p>
      <div className="flex flex-col gap-1.5">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-5">
            <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="text-[11px] font-black text-white tabular-nums">{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

const Shimmer = ({ className = '' }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-xl bg-white/5', className)} />
);

// ─── Error banner ─────────────────────────────────────────────────────────────

const QueryError = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
    <AlertTriangle className="w-4 h-4 shrink-0" />
    <span className="text-xs font-semibold flex-1">{message}</span>
    <button onClick={onRetry} className="p-1 hover:bg-rose-500/20 rounded-lg transition-colors">
      <RefreshCw className="w-3.5 h-3.5" />
    </button>
  </div>
);

// ─── KPI icons ────────────────────────────────────────────────────────────────

const KPI_META = [
  { icon: TrendingUp,   accent: 'rose',    label: 'Attrition Risk'     },
  { icon: ShieldAlert,  accent: 'amber',   label: 'High-Risk Employees'},
  { icon: Activity,     accent: 'emerald', label: 'Retention Score'    },
  { icon: Zap,          accent: 'indigo',  label: 'AI Confidence'      },
];

const ACCENT_CLASSES: Record<string, { bg: string; text: string; glow: string; bar: string }> = {
  rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    glow: 'shadow-rose-500/20',    bar: 'bg-rose-500'    },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   glow: 'shadow-amber-500/20',   bar: 'bg-amber-500'   },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', glow: 'shadow-emerald-500/20', bar: 'bg-emerald-500' },
  indigo:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  glow: 'shadow-indigo-500/20',  bar: 'bg-indigo-500'  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // React Query hooks — all backend-driven
  const { data: overview, isLoading: ovLoading, error: ovError, refetch: ovRefetch } = useOverview();
  const { data: riskDist, isLoading: rdLoading, error: rdError, refetch: rdRefetch } = useRiskDistribution();
  const { data: depts,    isLoading: deptLoading                                    } = useDepartments();
  const { data: highRisk, isLoading: hrLoading,  error: hrError, refetch: hrRefetch } = useHighRiskEmployees(5);
  const { data: trends,   isLoading: trendLoading                                   } = useTrends();

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    await new Promise(r => setTimeout(r, 900));
    setIsExporting(false);
  }, []);

  // Build KPI card values from backend overview
  const kpis = overview ? [
    {
      label: 'Overall Attrition Risk',
      value: `${(overview.avg_attrition_risk * 100).toFixed(1)}%`,
      delta: overview.avg_risk_delta,
      barPct: overview.avg_attrition_risk * 100,
      accentKey: 'rose',
    },
    {
      label: 'High-Risk Employees',
      value: overview.high_risk_count.toString(),
      delta: overview.high_risk_delta,
      barPct: Math.min((overview.high_risk_count / Math.max(overview.total_employees, 1)) * 100, 100),
      accentKey: 'amber',
    },
    {
      label: 'Retention Score',
      value: `${overview.retention_score}/100`,
      delta: overview.retention_delta,
      barPct: overview.retention_score,
      accentKey: 'emerald',
    },
    {
      label: 'AI Confidence',
      value: `${(overview.ai_confidence * 100).toFixed(1)}%`,
      delta: 0,
      barPct: overview.ai_confidence * 100,
      accentKey: 'indigo',
    },
  ] : null;

  const riskBuckets = riskDist?.buckets ?? [];
  const totalEmployees = riskDist?.total ?? overview?.total_employees ?? 0;
  const deptList  = depts?.departments ?? [];
  const hrList    = highRisk?.employees ?? [];
  const trendData = trends?.points ?? [];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative space-y-10 pb-24 min-h-screen"
      >
        {/* Ambient glow layers */}
        <div className="pointer-events-none -z-10 fixed inset-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-indigo-600/[0.04] blur-[130px]" />
          <div className="absolute bottom-[10%] right-[15%] w-[500px] h-[500px] rounded-full bg-violet-600/[0.04] blur-[120px]" />
          <div className="absolute top-[40%] left-[5%]  w-[300px] h-[300px] rounded-full bg-cyan-500/[0.03] blur-[100px]" />
        </div>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-2"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-black text-indigo-400/70 uppercase tracking-[0.2em]">
              AetherIQ · Workforce Intelligence
            </p>
            <h1 className="text-3xl font-display font-semibold text-white tracking-tight">
              Command Overview
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Real-time attrition intelligence powered by your PostgreSQL workforce data.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setUploadOpen(true)}
              className="group flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/35"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Employees
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="group flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white rounded-full text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
            >
              {isExporting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <FileText className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />}
              {isExporting ? 'Exporting…' : 'Export'}
            </button>
          </div>
        </motion.div>

        {/* Error banners */}
        <AnimatePresence>
          {(ovError || rdError || hrError) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {ovError && <QueryError message="Could not load overview metrics." onRetry={ovRefetch} />}
              {rdError && <QueryError message="Could not load risk distribution." onRetry={rdRefetch} />}
              {hrError && <QueryError message="Could not load high-risk employee list." onRetry={hrRefetch} />}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── KPI Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {ovLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Shimmer key={i} className="h-44 rounded-2xl" />
              ))
            : kpis?.map((kpi, idx) => {
                const meta   = KPI_META[idx];
                const accent = ACCENT_CLASSES[kpi.accentKey];
                const Icon   = meta.icon;
                const positive = kpi.delta >= 0;
                const isRisk = idx < 2;
                const isGood = isRisk ? !positive : positive;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + idx * 0.07, duration: 0.4 }}
                  >
                    <Card className="p-7 relative overflow-hidden group hover:border-white/10 transition-all">
                      {/* Subtle corner glow on hover */}
                      <div className={cn('absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500', accent.bg)} />

                      <div className="flex items-start justify-between mb-5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.16em] leading-tight max-w-[120px]">
                          {kpi.label}
                        </p>
                        <div className={cn('p-2 rounded-xl', accent.bg)}>
                          <Icon className={cn('w-4 h-4', accent.text)} />
                        </div>
                      </div>

                      <p className="text-4xl font-display font-semibold text-white tracking-tight mb-2 tabular-nums">
                        {kpi.value}
                      </p>

                      {kpi.delta !== 0 ? (
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-black rounded-full px-2 py-0.5 mb-5',
                          isGood
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        )}>
                          {positive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          {positive ? '+' : ''}{typeof kpi.delta === 'number' && kpi.delta % 1 !== 0 ? kpi.delta.toFixed(1) : kpi.delta}
                          {idx !== 1 ? '%' : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black rounded-full px-2 py-0.5 mb-5 bg-white/5 text-slate-500 border border-white/5">
                          Stable
                        </span>
                      )}

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] uppercase font-black tracking-widest text-white/20">
                          <span>Level</span>
                          <span className="tabular-nums">{kpi.barPct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${kpi.barPct}%` }}
                            transition={{ duration: 1.4, delay: 0.4 + idx * 0.1, ease: 'easeOut' }}
                            className={cn('h-full rounded-full', accent.bar)}
                          />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
        </div>

        {/* ── Main Charts Row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Retention Forecast — 2/3 width */}
          <Card className="p-7 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="space-y-0.5">
                <h3 className="text-lg font-display font-bold text-white tracking-tight">
                  Retention Forecast
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Observed attrition rate vs AI projection
                  {trends?.period_label && (
                    <span className="ml-2 text-indigo-400/70">· {trends.period_label}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => navigate('/history')}
                className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-1.5 bg-white/5 border border-white/5 hover:border-white/15 text-slate-400 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Full History
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {trendLoading ? (
              <Shimmer className="h-[320px] w-full" />
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0}    />
                      </linearGradient>
                      <linearGradient id="gPred" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#22d3ee" stopOpacity={0.08} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={12} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} unit="%" />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(99,102,241,0.15)', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="rate"      name="Observed"    stroke="#6366f1" strokeWidth={3} fill="url(#gActual)" dot={{ fill: '#6366f1', r: 3.5, strokeWidth: 2, stroke: '#1e1b4b' }} activeDot={{ r: 6, stroke: '#818cf8', strokeWidth: 2 }} connectNulls={false} animationDuration={1800} />
                    <Area type="monotone" dataKey="predicted" name="AI Forecast" stroke="#22d3ee" strokeWidth={2} strokeDasharray="7 5" fill="url(#gPred)" dot={false} animationDuration={2200} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-6 mt-5 pt-5 border-t border-white/5">
              <span className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                <span className="w-8 h-[3px] rounded-full bg-indigo-500 inline-block" /> Observed Rate
              </span>
              <span className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                <span className="w-8 h-[2px] rounded-full bg-cyan-400 inline-block border-dashed" style={{ backgroundImage: 'repeating-linear-gradient(to right, #22d3ee 0, #22d3ee 5px, transparent 5px, transparent 9px)' }} /> AI Forecast
              </span>
            </div>
          </Card>

          {/* Risk Distribution Donut — 1/3 */}
          <Card className="p-7 flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-display font-bold text-white tracking-tight">
                Risk Distribution
              </h3>
              <p className="text-[9px] text-white/25 font-black uppercase tracking-[0.16em] mt-0.5">
                Global Workforce Cohort
              </p>
            </div>

            {rdLoading ? (
              <Shimmer className="flex-1 min-h-[220px] rounded-2xl" />
            ) : (
              <div className="flex-1 min-h-[220px] relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={riskBuckets} cx="50%" cy="50%" innerRadius={68} outerRadius={96} paddingAngle={6} dataKey="value" animationDuration={1800} stroke="none">
                      {riskBuckets.map((entry, i) => (
                        <Cell key={i} fill={i === 0 ? '#10b981' : i === 1 ? '#f59e0b' : '#f43f5e'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#07080f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 11, fontWeight: 700, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center stat */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-display font-bold text-white tabular-nums">
                    {totalEmployees.toLocaleString()}
                  </span>
                  <span className="text-[9px] font-black text-white/25 uppercase tracking-[0.14em] mt-0.5">
                    Employees
                  </span>
                </div>
              </div>
            )}

            {/* Bucket list */}
            <div className="mt-5 space-y-2">
              {rdLoading
                ? Array.from({ length: 3 }).map((_, i) => <Shimmer key={i} className="h-9 rounded-xl" />)
                : riskBuckets.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all group">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i === 0 ? '#10b981' : i === 1 ? '#f59e0b' : '#f43f5e' }} />
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-tight group-hover:text-slate-200 transition-colors">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black text-slate-400">{item.value}</span>
                        <span className="text-[10px] font-mono font-black text-white tabular-nums">
                          {totalEmployees > 0 ? ((item.value / totalEmployees) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          </Card>
        </div>

        {/* ── Bottom Row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Risk Heatmap */}
          <Card className="p-7">
            <div className="mb-8">
              <h3 className="text-lg font-display font-bold text-white tracking-tight">
                Risk Concentration
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Average attrition risk by department
              </p>
            </div>

            {deptLoading ? (
              <Shimmer className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptList} layout="vertical" margin={{ left: 0, right: 36 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} width={90} />
                    <Tooltip cursor={{ fill: 'rgba(99,102,241,0.05)' }} content={<CustomTooltip />} />
                    <Bar dataKey="risk" radius={[0, 8, 8, 0]} barSize={12} label={{ position: 'right', formatter: (v: number) => `${v}%`, fill: '#475569', fontSize: 10, fontWeight: 700 }}>
                      {deptList.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.risk > 70 ? '#f43f5e' : entry.risk > 40 ? '#f59e0b' : '#10b981'}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* High-Risk Priority Queue */}
          <Card className="overflow-hidden flex flex-col">
            <div className="px-7 pt-7 pb-4 flex items-start justify-between">
              <div className="space-y-0.5">
                <h3 className="text-lg font-display font-bold text-white tracking-tight">
                  Retention Priority Queue
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Highest attrition risk · Requires HR review
                </p>
              </div>
              <button
                onClick={() => navigate('/employees')}
                className="group flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all"
              >
                All Employees
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="flex-1 overflow-x-auto px-4 pb-7">
              {hrLoading ? (
                <div className="space-y-3 p-3">
                  {Array.from({ length: 5 }).map((_, i) => <Shimmer key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/[0.03] rounded-xl">
                      <th className="px-5 py-3.5 text-[9px] font-black text-white/20 uppercase tracking-[0.14em] rounded-l-xl">Employee</th>
                      <th className="px-5 py-3.5 text-[9px] font-black text-white/20 uppercase tracking-[0.14em]">Dept</th>
                      <th className="px-5 py-3.5 text-[9px] font-black text-white/20 uppercase tracking-[0.14em]">Risk Score</th>
                      <th className="px-5 py-3.5 text-[9px] font-black text-white/20 uppercase tracking-[0.14em] text-right rounded-r-xl">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {hrList.map((row, idx) => (
                      <motion.tr
                        key={row.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + idx * 0.06 }}
                        onClick={() => navigate(`/employees/${row.id}`)}
                        className="hover:bg-white/[0.025] transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <ProfileAvatar
                              employeeId={row.id}
                              initials={row.name.split(' ').map((n: string) => n[0]).join('')}
                              size="sm"
                              className="border border-white/10 ring-1 ring-white/5 shrink-0"
                              editable={false}
                            />
                            <div>
                              <p className="text-[12px] font-bold text-white group-hover:text-indigo-300 transition-colors tracking-tight">
                                {row.name}
                              </p>
                              <p className="text-[9px] font-mono text-white/20">
                                {row.role}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="neutral" className="bg-white/5 text-slate-400 border-white/5 text-[9px] font-black">
                            {row.dept}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className={cn(
                              'text-[12px] font-black font-mono tabular-nums',
                              row.risk > 0.7 ? 'text-rose-400' : row.risk > 0.4 ? 'text-amber-400' : 'text-emerald-400'
                            )}>
                              {(row.risk * 100).toFixed(1)}%
                            </span>
                            <div className="w-20 h-[3px] bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${row.risk * 100}%` }}
                                transition={{ duration: 1.2, delay: 1 + idx * 0.08 }}
                                className={cn('h-full rounded-full', row.risk > 0.7 ? 'bg-rose-500' : row.risk > 0.4 ? 'bg-amber-500' : 'bg-emerald-500')}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/8 text-white/25 group-hover:text-indigo-400 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/10 transition-all">
                            <ArrowUpRight className="w-4 h-4" />
                          </div>
                        </td>
                      </motion.tr>
                    ))}

                    {hrList.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-slate-600 text-sm font-medium">
                          No high-risk employees at this time.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Upload Modal */}
      <UploadEmployeeModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}
