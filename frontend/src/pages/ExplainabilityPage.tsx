import React from 'react';
import { Card, Badge } from '@/components/ui/Layout';
import { SHAP_EXPLANATION } from '@/constants/mockData';
import { motion } from 'framer-motion';
import { Info, AlertCircle, TrendingUp, TrendingDown, InfoIcon, Brain } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  ReferenceLine
} from 'recharts';

export function ExplainabilityPage() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4 }}
      className="relative space-y-12 pb-24"
    >
      {/* Decorative Atmosphere */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="info" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-bold uppercase tracking-[0.2em] px-4 py-1.5">Model: Aether-BERT L4.2</Badge>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h1 className="text-5xl font-display font-bold text-white tracking-tight leading-none uppercase">Neural Explainability</h1>
          <p className="text-slate-400 font-medium max-w-2xl text-lg">Deciphering the AetherIQ Neural Mesh. Deep feature contribution analysis using non-linear SHAPLEY value distributions.</p>
        </div>
        <Card className="p-8 flex items-center gap-6 group hover:-translate-y-1 transition-all duration-300">
           <div className="w-20 h-20 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center shrink-0 shadow-2xl shadow-indigo-600/30 group-hover:scale-110 transition-transform duration-500">
              <Brain className="w-10 h-10 text-white" />
           </div>
           <div className="space-y-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Model Fidelity</p>
                <p className="text-4xl font-display font-bold text-slate-900 tracking-tighter leading-none">99.82<span className="text-sm text-indigo-400 ml-1">%</span></p>
              </div>
              <div className="flex items-center gap-6 pt-2 border-t border-slate-50">
                 <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-0.5">Model Version</p>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider leading-none">v4.2.0-Production</p>
                 </div>
                 <div className="w-px h-6 bg-slate-100" />
                 <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-0.5">Last Trained</p>
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider leading-none">12 May 2026</p>
                 </div>
              </div>
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* SHAP Chart Area */}
        <Card className="lg:col-span-8 p-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
            <Brain className="w-64 h-64 text-indigo-600" />
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 relative">
            <div className="space-y-1">
              <h3 className="text-2xl font-display font-bold text-white tracking-tight uppercase">Feature Vectors</h3>
              <p className="text-xs font-medium text-slate-500">Global attribution weights across all network nodes.</p>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
                <span className="text-[10px] text-white/30 font-black uppercase tracking-widest">Risk Signal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                <span className="text-[10px] text-white/30 font-black uppercase tracking-widest">Anchor Signal</span>
              </div>
            </div>
          </div>

          <div className="h-[500px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={SHAP_EXPLANATION}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="8 8" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="feature" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }} 
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                  contentStyle={{ backgroundColor: '#0a0b14', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', padding: '16px' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#818cf8' }}
                />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
                <Bar 
                  dataKey="contribution" 
                  radius={[0, 20, 20, 0]}
                  barSize={24}
                >
                  {SHAP_EXPLANATION.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.type === 'positive' ? '#f43f5e' : '#10b981'} 
                      className="transition-opacity duration-300 hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Intelligence Side Column */}
        <div className="lg:col-span-4 space-y-10">
           <Card className="p-10 space-y-8 border-l-[6px] border-l-rose-500 hover:premium-shadow transition-all group">
              <div className="w-14 h-14 rounded-[1.25rem] bg-rose-500/10 flex items-center justify-center border border-rose-500/20 group-hover:scale-110 transition-transform duration-500">
                <TrendingUp className="w-8 h-8 text-rose-400" />
              </div>
              <div className="space-y-4">
                 <h4 className="text-2xl font-display font-bold text-white tracking-tight leading-none uppercase">Burnout Saturation</h4>
                 <p className="text-slate-400 font-medium leading-relaxed">
                   Nodes exceeding {">"} 10 hours of weekly overtime display <span className="text-rose-400 font-black">2.4x instability probability</span>. This vector accounts for 28% of total network risk.
                 </p>
              </div>
              <button className="text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-300 transition-colors">See Correlation Matrix →</button>
           </Card>

           <Card className="p-10 space-y-8 border-l-[6px] border-l-emerald-500 hover:premium-shadow transition-all group">
              <div className="w-14 h-14 rounded-[1.25rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                <TrendingDown className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="space-y-4">
                 <h4 className="text-2xl font-display font-bold text-white tracking-tight leading-none uppercase">Retention Tether</h4>
                 <p className="text-slate-400 font-medium leading-relaxed">
                   Equity vesting remains the primary anchor. Nodes with {">"} 50% non-vested stock display zero-leakage profiles, overriding high-dissatisfaction signals.
                 </p>
              </div>
              <button className="text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors">Analyze Vesting Waves →</button>
           </Card>

           <Card className="p-10 bg-indigo-600 rounded-[2.5rem] relative overflow-hidden group shadow-2xl shadow-indigo-600/30">
              <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                <AlertCircle className="w-32 h-32 text-white" />
              </div>
              <div className="relative space-y-6">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                     <Brain className="w-5 h-5 text-white" />
                   </div>
                   <span className="text-[11px] font-black text-white uppercase tracking-[0.3em]">AI Synthesis</span>
                </div>
                <p className="text-white/80 text-lg leading-relaxed italic font-medium">
                  "The mesh is currently balanced by fiscal tethers. While satisfaction signatures are sub-optimal, upcoming vesting batches are suppressing attrition propagation. Watch for 'Promotion Cycle' latency."
                </p>
              </div>
           </Card>
        </div>
      </div>
    </motion.div>
  );
}
