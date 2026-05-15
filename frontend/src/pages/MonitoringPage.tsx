import React from 'react';
import { Card, Badge } from '@/components/ui/Layout';
import { 
  Activity, 
  Cpu, 
  Database, 
  Globe, 
  Server, 
  ShieldAlert, 
  Zap,
  Terminal,
  Clock,
  CheckCircle,
  BarChart
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const TELEMETRY_DATA = [
  { time: '10:00', latency: 42, cpu: 22, throughput: 120 },
  { time: '10:05', latency: 45, cpu: 25, throughput: 115 },
  { time: '10:10', latency: 120, cpu: 45, throughput: 180 },
  { time: '10:15', latency: 50, cpu: 28, throughput: 130 },
  { time: '10:20', latency: 40, cpu: 20, throughput: 110 },
  { time: '10:25', latency: 38, cpu: 18, throughput: 105 },
];

export function MonitoringPage() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4 }}
      className="relative space-y-12 pb-24"
    >
      {/* Decorative Atmosphere */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="info" className="bg-indigo-50 text-indigo-600 border-indigo-100 font-bold uppercase tracking-[0.2em] px-4 py-1.5">Cluster: Aether-East-01</Badge>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h1 className="text-5xl font-display font-bold text-white tracking-tight leading-none uppercase">System Telemetry</h1>
          <p className="text-slate-400 font-medium max-w-2xl text-lg">Real-time infrastructure health monitoring. Observing neural inference cycles and cluster orchestration metrics.</p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl premium-shadow group cursor-pointer hover:border-indigo-500/50 transition-all">
           <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover:text-indigo-400 transition-colors">Systems Nominal</span>
        </div>
      </div>

      {/* Real-time Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Inference Latency', value: '42ms', sub: 'P99: 115ms', icon: Clock, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Worker Load', value: '1.2k', sub: 'req/min', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Neural Capacity', value: '64%', sub: '24GB Cluster', icon: Cpu, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Signal Integrity', value: 'Healthy', sub: 'Redundant Stack', icon: Database, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((stat, i) => (
          <Card key={i} className="p-8 flex flex-col gap-6 group hover:-translate-y-1 transition-all duration-300">
             <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", stat.bg)}>
                <stat.icon className={cn("w-7 h-7", stat.color)} />
             </div>
             <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 leading-none">{stat.label}</p>
                <div className="flex items-end gap-2">
                   <h3 className="text-3xl font-display font-bold text-white tracking-tighter leading-none">{stat.value}</h3>
                   <span className="text-xs font-bold text-white/30 leading-none">{stat.sub}</span>
                </div>
             </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Latency Graph */}
        <Card className="lg:col-span-8 p-10 relative group">
           <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
             <BarChart className="w-48 h-48 text-indigo-600" />
           </div>
           
           <div className="flex items-center justify-between mb-12 relative">
              <div className="space-y-1">
                <h3 className="text-2xl font-display font-bold text-white tracking-tight uppercase">Performance Flux</h3>
                <p className="text-xs font-medium text-slate-500">Inference latency measured across 300s window.</p>
              </div>
              <div className="px-6 py-2 bg-indigo-500/10 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">Real-time Stream</div>
           </div>
           <div className="h-[350px] w-full pt-8 relative">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TELEMETRY_DATA}>
                  <defs>
                    <linearGradient id="latencyGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                  <YAxis hide domain={[0, 150]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0b14', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', padding: '16px' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#818cf8' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="latency" 
                    stroke="#6366f1" 
                    strokeWidth={4} 
                    fill="url(#latencyGlow)" 
                    dot={{ r: 5, fill: '#6366f1', strokeWidth: 4, stroke: '#0a0b14' }} 
                    activeDot={{ r: 8, strokeWidth: 5 }}
                  />
                </AreaChart>
             </ResponsiveContainer>
           </div>
        </Card>

        {/* Worker Nodes */}
        <Card className="lg:col-span-4 p-10 flex flex-col group overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
             <Server className="w-32 h-32 text-emerald-600" />
           </div>
           
           <div className="mb-10 relative">
              <h3 className="text-2xl font-display font-bold text-white tracking-tight leading-none uppercase">Cluster Nodes</h3>
              <p className="text-xs font-medium text-slate-500 mt-2">Active neural processing units.</p>
           </div>
           
           <div className="space-y-6 flex-1 relative">
              {[
                { name: 'Worker-Alpha', status: 'online', tasks: 12, color: 'bg-indigo-500' },
                { name: 'Worker-Bravo', status: 'online', tasks: 8, color: 'bg-emerald-500' },
                { name: 'Worker-Charlie', status: 'error', tasks: 0, color: 'bg-rose-500' },
                { name: 'Worker-Delta', status: 'online', tasks: 15, color: 'bg-purple-500' },
              ].map((node, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group/node hover:premium-shadow-sm hover:border-indigo-500/50 transition-all cursor-pointer">
                   <div className="flex items-center gap-4">
                      <div className={cn(
                         "w-2.5 h-2.5 rounded-full",
                         node.status === 'online' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                      )} />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white leading-none mb-1">{node.name}</span>
                        <span className={cn("text-[9px] font-black uppercase tracking-widest", node.status === 'online' ? "text-emerald-400" : "text-rose-400")}>
                          {node.status}
                        </span>
                      </div>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-tight">{node.tasks} ACTIVE REQ.</span>
                      <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                         <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(node.tasks / 20) * 100}%` }}
                          className={cn("h-full", node.color)} 
                         />
                      </div>
                   </div>
                </div>
              ))}
           </div>
           <div className="mt-10 pt-8 border-t border-white/5 relative">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest mb-4">
                 <span className="text-white/20">Node Orchestration</span>
                 <span className="text-indigo-400">Auto-Scale ON</span>
              </div>
              <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden p-[1px] relative">
                 <div className="absolute inset-0 bg-linear-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 -z-10" />
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: '74%' }}
                   className="h-full bg-linear-to-r from-indigo-600 to-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.3)]" 
                 />
              </div>
           </div>
        </Card>
      </div>

      {/* Logs Console */}
      <Card className="p-0 border-none overflow-hidden premium-shadow-lg relative min-h-[400px] flex flex-col bg-slate-950">
         <div className="absolute inset-0 bg-linear-to-b from-indigo-500/10 to-transparent opacity-10 pointer-events-none" />
         
         <div className="p-6 bg-slate-900 border-b border-white/5 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
               <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                  <Terminal className="w-4 h-4 text-emerald-400" />
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Execution Environment</span>
                  <span className="text-xs font-bold text-white uppercase tracking-widest">Neural Mesh Event Stream</span>
               </div>
            </div>
            <div className="flex gap-4">
                <Badge variant="neutral" className="bg-white/5 text-slate-400 border-none px-3 text-[10px] uppercase font-black tracking-widest">Buffer: 4096KB</Badge>
                <div className="flex gap-2 items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>
            </div>
         </div>
         <div className="p-8 font-mono text-xs space-y-4 flex-1 overflow-y-auto no-scrollbar relative z-10">
            <div className="flex gap-6 group">
              <span className="text-slate-600 font-bold shrink-0">[10:24:02]</span>
              <span className="text-white hover:text-emerald-400 transition-colors"><span className="text-indigo-400 underline decoration-indigo-400/30 font-black tracking-widest uppercase text-[10px] mr-3">CORE_INFO</span> Received inference request for EmployeeID #8432</span>
            </div>
            <div className="flex gap-6 group">
              <span className="text-slate-600 font-bold shrink-0">[10:24:02]</span>
              <span className="text-white hover:text-emerald-400 transition-colors"><span className="text-indigo-400 underline decoration-indigo-400/30 font-black tracking-widest uppercase text-[10px] mr-3">CORE_INFO</span> Extracting 42 dimensional feature vector...</span>
            </div>
            <div className="flex gap-6 group">
              <span className="text-slate-600 font-bold shrink-0">[10:24:02]</span>
              <span className="text-emerald-400"><span className="text-emerald-400/50 underline decoration-emerald-400/30 font-black tracking-widest uppercase text-[10px] mr-3">TRACE_SYNC</span> Aether-Encoder-L4 executed in 12.4ms [SUCCESS]</span>
            </div>
            <div className="flex gap-6 group">
              <span className="text-slate-600 font-bold shrink-0">[10:24:03]</span>
              <span className="text-white hover:text-emerald-400 transition-colors"><span className="text-indigo-400 underline decoration-indigo-400/30 font-black tracking-widest uppercase text-[10px] mr-3">CORE_INFO</span> SHAP contributions calculated core parameters</span>
            </div>
            <div className="flex gap-6 group">
              <span className="text-slate-600 font-bold shrink-0">[10:24:04]</span>
              <span className="text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/20"><span className="text-rose-400 font-black tracking-widest uppercase text-[10px] mr-3">CRIT_SIGNAL</span> Predicted risk (82.4%) exceeds threshold (75.0%)</span>
            </div>
            <div className="flex gap-6 group">
              <span className="text-slate-600 font-bold shrink-0">[10:24:04]</span>
              <span className="text-emerald-400"><span className="text-emerald-400/50 underline decoration-emerald-400/30 font-black tracking-widest uppercase text-[10px] mr-3">STATE_PUSH</span> Assessment logged to Global Mesh and Signal Cache</span>
            </div>
            <div className="flex gap-6 group">
              <span className="text-slate-600 font-bold shrink-0">[10:24:05]</span>
              <span className="text-indigo-300"><span className="text-indigo-400 underline decoration-indigo-400/30 font-black tracking-widest uppercase text-[10px] mr-3">SYS_ORCH</span> Worker-Node-Delta scaling due to high queue pressure</span>
            </div>
            <p className="text-white/20 animate-pulse tracking-[0.5em] pl-20">_</p>
         </div>
         <div className="p-4 bg-slate-900 border-t border-white/5 flex items-center justify-between px-8 relative z-10">
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Console: Active</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cluster: aether-east-cluster-01</span>
               </div>
            </div>
            <button className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] hover:text-white transition-colors">Clear Stream Buffer</button>
         </div>
      </Card>
    </motion.div>
  );
}
