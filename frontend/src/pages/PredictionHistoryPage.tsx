import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge } from '@/components/ui/Layout';
import { RECENT_PREDICTIONS } from '@/constants/mockData';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  Trash2,
  Calendar,
  Layers,
  UserCheck,
  FileText,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { exportToPDF } from '@/utils/pdfExport';

export function PredictionHistoryPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    await exportToPDF('history-content', `prediction-history-${new Date().toISOString().split('T')[0]}`);
    setIsExporting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      id="history-content" 
      className="relative space-y-12 pb-24"
    >
      {/* Decorative Atmosphere */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-[2px] bg-indigo-500 rounded-full" />
             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Neural Archive</span>
          </div>
          <h1 className="text-5xl font-display font-bold text-white tracking-tight leading-none uppercase">Prediction Audit</h1>
          <p className="text-slate-400 font-medium text-lg">Comprehensive audit trail of all machine-learned attrition assessments executed within the AetherIQ mesh.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-3 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50 hover:scale-[1.02] active:scale-95"
          >
             {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
             {isExporting ? 'Processing Archive...' : 'Export High-Fidelity PDF'}
          </button>
          <button className="flex items-center justify-center w-12 h-12 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-2xl premium-shadow transition-all group">
             <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      <Card className="overflow-hidden border-none premium-shadow-lg">
        <div className="p-8 border-b border-white/5 bg-transparent flex flex-col lg:flex-row lg:items-center justify-between gap-8">
           <div className="relative max-w-md w-full group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-white transition-colors" />
              <input 
                type="text" 
                placeholder="Search Archive by ID or Signature..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm text-white font-bold placeholder:text-white/20 focus:outline-hidden focus:bg-white/10 focus:border-indigo-500/50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
              {['All', 'High Risk', 'Medium Risk', 'Low Risk'].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={cn(
                    "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    selectedStatus === status 
                      ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 active:scale-95" 
                      : "bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {status}
                </button>
              ))}
           </div>
        </div>
 
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-8 py-5 first:rounded-tl-2xl last:rounded-tr-2xl">
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
              {RECENT_PREDICTIONS.map((item, idx) => (
                <motion.tr 
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group hover:bg-white/[0.03] transition-all cursor-pointer relative"
                  onClick={() => navigate(`/employees/${item.id}`)}
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                       <ProfileAvatar 
                         employeeId={item.id} 
                         initials={item.employee.split(' ').map(n => n[0]).join('')} 
                         size="sm"
                         className="border-2 border-white/10 shadow-md ring-1 ring-white/10 group-hover:scale-110 transition-transform"
                         editable={false}
                       />
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight leading-none mb-1.5">{item.employee}</span>
                          <span className="text-[10px] text-white/20 font-black font-mono tracking-widest uppercase opacity-70">NODE-{(8000 + parseInt(item.id)).toString()}</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-2 items-start">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{item.department}</span>
                      <Badge variant={item.status === 'High Risk' ? 'danger' : item.status === 'Medium Risk' ? 'warning' : 'success'} className="font-black text-[9px] px-2 py-0.5 border-none bg-transparent">
                        <span className={cn(
                          item.status === 'High Risk' ? "text-rose-400" : item.status === 'Medium Risk' ? "text-amber-400" : "text-emerald-400"
                        )}>
                          {item.status.toUpperCase()}
                        </span>
                      </Badge>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                       <span className="text-xs font-bold text-white/60 tracking-tight">{item.date}</span>
                       <span className="text-[10px] text-indigo-400/60 font-bold uppercase tracking-widest">14:24:02 UTC</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-10">
                       <div className="flex flex-col items-end">
                         <span className={cn(
                           "text-3xl font-display font-bold tracking-tighter transition-all group-hover:scale-110 group-hover:rotate-1",
                           item.score > 0.7 ? "text-rose-400" : item.score > 0.4 ? "text-amber-400" : "text-indigo-400"
                         )}>
                           {(item.score * 100).toFixed(1)}<span className="text-[10px] ml-0.5 opacity-50">%</span>
                         </span>
                         <div className="w-24 h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden p-[1px]">
                            <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${item.score * 100}%` }}
                               transition={{ duration: 1, delay: 0.5 }}
                               className={cn("h-full rounded-full", item.score > 0.7 ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : item.score > 0.4 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]")}
                            />
                         </div>
                       </div>
                       <div className="hidden xl:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          <button className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/30 active:scale-90 transition-all">
                             <Eye className="w-5 h-5" />
                          </button>
                          <button className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 text-slate-500 hover:text-rose-400 rounded-xl hover:border-rose-400/30 active:scale-90 transition-all">
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
 
        <div className="p-8 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
           <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Archival Data Segment: <span className="text-indigo-400 font-bold">NODE_STREAM_01</span></span>
           <div className="flex items-center gap-2">
              <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-500 shadow-sm disabled:opacity-30 transition-all hover:border-indigo-500/30 hover:text-white group">
                <ChevronLeft className="w-5 h-5 group-active:-translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-1.5 px-1.5">
                 {[1, 2, 3].map(p => (
                   <button key={p} className={cn("w-10 h-10 rounded-xl text-[11px] font-black uppercase transition-all", p === 1 ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30" : "bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10 hover:text-white active:scale-95")}>
                     {p}
                   </button>
                 ))}
                 <div className="w-10 h-10 flex items-center justify-center text-white/5">...</div>
                 <button className="w-10 h-10 rounded-xl text-[11px] font-black uppercase bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10 hover:text-white active:scale-95">
                   24
                 </button>
              </div>
              <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-500 shadow-sm hover:border-indigo-500/30 hover:text-white transition-all group">
                <ChevronRight className="w-5 h-5 group-active:translate-x-1 transition-transform" />
              </button>
           </div>
        </div>
      </Card>
    </motion.div>
  );
}
