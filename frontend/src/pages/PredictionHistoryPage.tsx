/**
 * PredictionHistoryPage.tsx
 *
 * PRODUCTION VERSION — all mock data removed.
 * Loads real prediction history from GET /api/v1/predictions (PostgreSQL).
 * Supports search, status filter, and pagination.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge } from '@/components/ui/Layout';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Layers,
  UserCheck,
  FileText,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Database,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { exportToPDF } from '@/utils/pdfExport';
import {
  fetchPredictionHistory,
  type PredictionHistoryItem,
} from '@/services/predictionApi';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Converts backend confidence + prediction into a UI risk level string */
function toRiskLevel(prediction: 0 | 1, confidence: number): 'High Risk' | 'Medium Risk' | 'Low Risk' {
  if (prediction === 0) return 'Low Risk';
  if (confidence >= 0.7) return 'High Risk';
  return 'Medium Risk';
}

/** Formats an ISO timestamp to a human-friendly date string */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Formats an ISO timestamp to UTC time HH:MM:SS */
function formatTime(iso: string): string {
  try {
    return new Date(iso).toISOString().split('T')[1].split('.')[0] + ' UTC';
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['All', 'High Risk', 'Medium Risk', 'Low Risk'] as const;
const PAGE_SIZE = 20;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function PredictionHistoryPage() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [predictions, setPredictions] = useState<PredictionHistoryItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<typeof STATUS_FILTERS[number]>('All');

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

  /** Client-side filter applied on top of server-paginated results */
  const displayedPredictions = predictions.filter((p) => {
    const risk = toRiskLevel(p.prediction, p.confidence);

    const matchesStatus =
      selectedStatus === 'All' || risk === selectedStatus;

    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      String(p.employee_id).includes(term) ||
      p.prediction_id.toLowerCase().includes(term) ||
      p.model_name.toLowerCase().includes(term);

    return matchesStatus && matchesSearch;
  });

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadHistory = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchPredictionHistory({
        page,
        page_size: PAGE_SIZE,
      });

      setPredictions(data.predictions);
      setTotalRecords(data.total);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ??
        err?.message ??
        'Failed to load prediction history.';
      setError(msg);
      console.error('[PredictionHistoryPage] Load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount and whenever page changes
  useEffect(() => {
    loadHistory(currentPage);
  }, [currentPage, loadHistory]);

  // ── Pagination handlers ────────────────────────────────────────────────────
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setIsExporting(true);
    await exportToPDF(
      'history-content',
      `prediction-history-${new Date().toISOString().split('T')[0]}`
    );
    setIsExporting(false);
  };

  // ── Render pagination buttons ──────────────────────────────────────────────
  const renderPageButtons = () => {
    const buttons: React.ReactNode[] = [];
    const maxVisible = 3;

    // Always show first page
    buttons.push(
      <button
        key={1}
        onClick={() => goToPage(1)}
        className={cn(
          'w-10 h-10 rounded-xl text-[11px] font-black uppercase transition-all',
          currentPage === 1
            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30'
            : 'bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10 hover:text-white active:scale-95'
        )}
      >
        1
      </button>
    );

    if (currentPage > maxVisible) {
      buttons.push(
        <div key="ellipsis-start" className="w-10 h-10 flex items-center justify-center text-white/20 text-xs">
          …
        </div>
      );
    }

    // Pages around current
    for (
      let p = Math.max(2, currentPage - 1);
      p <= Math.min(totalPages - 1, currentPage + 1);
      p++
    ) {
      const page = p;
      buttons.push(
        <button
          key={page}
          onClick={() => goToPage(page)}
          className={cn(
            'w-10 h-10 rounded-xl text-[11px] font-black uppercase transition-all',
            currentPage === page
              ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30'
              : 'bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10 hover:text-white active:scale-95'
          )}
        >
          {page}
        </button>
      );
    }

    if (currentPage < totalPages - maxVisible + 1 && totalPages > maxVisible + 1) {
      buttons.push(
        <div key="ellipsis-end" className="w-10 h-10 flex items-center justify-center text-white/20 text-xs">
          …
        </div>
      );
    }

    // Always show last page (if more than 1)
    if (totalPages > 1) {
      buttons.push(
        <button
          key={totalPages}
          onClick={() => goToPage(totalPages)}
          className={cn(
            'w-10 h-10 rounded-xl text-[11px] font-black uppercase transition-all',
            currentPage === totalPages
              ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30'
              : 'bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10 hover:text-white active:scale-95'
          )}
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      id="history-content"
      className="relative space-y-12 pb-24"
    >
      {/* Atmosphere */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-[2px] bg-indigo-500 rounded-full" />
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">
              Neural Archive
            </span>
          </div>
          <h1 className="text-5xl font-display font-bold text-white tracking-tight leading-none uppercase">
            Prediction Audit
          </h1>
          <p className="text-slate-400 font-medium text-lg">
            Comprehensive audit trail of all machine-learned attrition assessments
            executed within the AetherIQ mesh.
          </p>
          {/* Live stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/8 rounded-xl">
              <Database className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                {totalRecords.toLocaleString()} Records
              </span>
            </div>
            {!isLoading && (
              <button
                onClick={() => loadHistory(currentPage)}
                className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/8 rounded-xl text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white hover:border-indigo-500/30 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-3 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50 hover:scale-[1.02] active:scale-95"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {isExporting ? 'Processing Archive…' : 'Export High-Fidelity PDF'}
          </button>
          <button className="flex items-center justify-center w-12 h-12 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-2xl premium-shadow transition-all group">
            <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      <Card className="overflow-hidden border-none premium-shadow-lg">
        {/* ── Toolbar ── */}
        <div className="p-8 border-b border-white/5 bg-transparent flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="relative max-w-md w-full group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="Search by Employee ID or Trace ID…"
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm text-white font-bold placeholder:text-white/20 focus:outline-hidden focus:bg-white/10 focus:border-indigo-500/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={cn(
                  'px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                  selectedStatus === status
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 active:scale-95'
                    : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white'
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-8 py-5">
                  <div className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <UserCheck className="w-4 h-4" />
                    Target Profile
                  </div>
                </th>
                <th className="px-8 py-5">
                  <div className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <Layers className="w-4 h-4" />
                    Segment Matrix
                  </div>
                </th>
                <th className="px-8 py-5">
                  <div className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <Calendar className="w-4 h-4" />
                    Cycle Timestamp
                  </div>
                </th>
                <th className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    Neural Confidence
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {/* ── Loading rows ── */}
                {isLoading &&
                  Array.from({ length: 8 }).map((_, idx) => (
                    <motion.tr
                      key={`skeleton-${idx}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      {[...Array(4)].map((_, col) => (
                        <td key={col} className="px-8 py-6">
                          <div className="h-4 bg-white/5 rounded-lg animate-pulse" style={{ width: `${60 + col * 10}%` }} />
                        </td>
                      ))}
                    </motion.tr>
                  ))}

                {/* ── Error row ── */}
                {!isLoading && error && (
                  <motion.tr key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan={4} className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-rose-400" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest mb-2">
                            Failed to Load History
                          </p>
                          <p className="text-sm text-slate-500 max-w-md">{error}</p>
                        </div>
                        <button
                          onClick={() => loadHistory(currentPage)}
                          className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-500/30 hover:text-white transition-all"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )}

                {/* ── Empty state ── */}
                {!isLoading && !error && displayedPredictions.length === 0 && (
                  <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan={4} className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                          <Database className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                            No Records Found
                          </p>
                          <p className="text-sm text-slate-600">
                            {searchTerm || selectedStatus !== 'All'
                              ? 'Try adjusting your search or filter.'
                              : 'Run your first prediction to see it appear here.'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                )}

                {/* ── Data rows ── */}
                {!isLoading &&
                  !error &&
                  displayedPredictions.map((item, idx) => {
                    const risk = toRiskLevel(item.prediction, item.confidence);
                    const initials = `E${String(item.employee_id).slice(-2)}`;

                    return (
                      <motion.tr
                        key={item.prediction_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: idx * 0.04 }}
                        className="group hover:bg-white/[0.03] transition-all cursor-pointer relative"
                        onClick={() => navigate(`/employees/${item.employee_id}`)}
                      >
                        {/* Employee */}
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-5">
                            <ProfileAvatar
                              employeeId={String(item.employee_id)}
                              initials={initials}
                              size="sm"
                              className="border-2 border-white/10 shadow-md ring-1 ring-white/10 group-hover:scale-110 transition-transform"
                              editable={false}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight leading-none mb-1.5">
                                Employee #{item.employee_id}
                              </span>
                              <span className="text-[10px] text-white/20 font-black font-mono tracking-widest uppercase opacity-70">
                                {item.prediction_id.split('-')[0].toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Segment */}
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-2 items-start">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight font-mono truncate max-w-[140px]">
                              {item.model_name}
                            </span>
                            <Badge
                              variant={
                                risk === 'High Risk'
                                  ? 'danger'
                                  : risk === 'Medium Risk'
                                  ? 'warning'
                                  : 'success'
                              }
                              className="font-black text-[9px] px-2 py-0.5 border-none bg-transparent"
                            >
                              <span
                                className={cn(
                                  risk === 'High Risk'
                                    ? 'text-rose-400'
                                    : risk === 'Medium Risk'
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                )}
                              >
                                {risk.toUpperCase()}
                              </span>
                            </Badge>
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-white/60 tracking-tight">
                              {formatDate(item.timestamp)}
                            </span>
                            <span className="text-[10px] text-indigo-400/60 font-bold uppercase tracking-widest">
                              {formatTime(item.timestamp)}
                            </span>
                          </div>
                        </td>

                        {/* Confidence + Actions */}
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-10">
                            <div className="flex flex-col items-end">
                              <span
                                className={cn(
                                  'text-3xl font-display font-bold tracking-tighter transition-all group-hover:scale-110 group-hover:rotate-1',
                                  item.confidence > 0.7
                                    ? 'text-rose-400'
                                    : item.confidence > 0.4
                                    ? 'text-amber-400'
                                    : 'text-indigo-400'
                                )}
                              >
                                {(item.confidence * 100).toFixed(1)}
                                <span className="text-[10px] ml-0.5 opacity-50">%</span>
                              </span>
                              <div className="w-24 h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden p-[1px]">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.confidence * 100}%` }}
                                  transition={{ duration: 1, delay: 0.3 + idx * 0.04 }}
                                  className={cn(
                                    'h-full rounded-full',
                                    item.confidence > 0.7
                                      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                      : item.confidence > 0.4
                                      ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                                      : 'bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]'
                                  )}
                                />
                              </div>
                            </div>

                            {/* Hover actions */}
                            <div className="hidden xl:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/employees/${item.employee_id}`);
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/30 active:scale-90 transition-all"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* ── Footer / Pagination ── */}
        <div className="p-8 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
            Showing{' '}
            <span className="text-indigo-400 font-bold">
              {displayedPredictions.length}
            </span>{' '}
            of{' '}
            <span className="text-indigo-400 font-bold">{totalRecords}</span>{' '}
            total records
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-500 disabled:opacity-30 transition-all hover:border-indigo-500/30 hover:text-white group"
            >
              <ChevronLeft className="w-5 h-5 group-active:-translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center gap-1.5 px-1.5">
              {renderPageButtons()}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-500 disabled:opacity-30 transition-all hover:border-indigo-500/30 hover:text-white group"
            >
              <ChevronRight className="w-5 h-5 group-active:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
