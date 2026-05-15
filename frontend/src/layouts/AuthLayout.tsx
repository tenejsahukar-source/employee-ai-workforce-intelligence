import React from 'react';
import { Outlet } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#020205] text-white flex items-center justify-center relative overflow-hidden selection:bg-rose-500/30">
      {/* Cinematic Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle persistent Moon element in Auth pages */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] opacity-40 blur-[2px]">
           <div className="absolute inset-0 rounded-full bg-linear-to-br from-indigo-500/20 via-purple-500/10 to-transparent blur-[100px] mix-blend-plus-lighter" />
           <img 
             src="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2000&auto=format&fit=crop" 
             alt="" 
             className="absolute inset-0 w-full h-full object-cover rounded-full opacity-30 mix-blend-screen grayscale brightness-125"
             referrerPolicy="no-referrer"
           />
        </div>

        <motion.div 
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[70%] bg-indigo-600/30 blur-[150px] rounded-full" 
        />
        <motion.div 
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] bg-purple-600/30 blur-[150px] rounded-full" 
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#020205_80%)]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
      </div>

      <div className="container relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-24 items-center px-6 py-20 pb-40">
        {/* Value Proposition */}
        <div className="hidden lg:flex flex-col justify-center space-y-12">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-500 shadow-2xl shadow-indigo-500/20">
               <Zap className="w-6 h-6 fill-current" />
             </div>
             <div className="flex flex-col">
               <span className="font-display font-black text-2xl tracking-tighter text-white leading-none uppercase italic">AetherIQ</span>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Intelligence Platform</span>
             </div>
          </div>

          <div className="space-y-6">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-7xl font-display font-black leading-[0.9] tracking-tighter"
            >
              PREDICT.<br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-500 to-purple-500">UNDERSTAND.</span><br />
              RETAIN.
            </motion.h1>
            <p className="text-xl text-slate-400 font-medium max-w-lg leading-relaxed">
              Experience the evolution of workforce intelligence. Harness high-fidelity neural parameters 
              to stabilize enterprise ecosystems and optimize human capital.
            </p>
          </div>

          <div className="flex items-center gap-12">
             <div className="flex flex-col gap-1">
               <span className="text-3xl font-display font-bold text-white tracking-tighter">98.4%</span>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Model Precision</span>
             </div>
             <div className="w-px h-10 bg-white/5" />
             <div className="flex flex-col gap-1">
               <span className="text-3xl font-display font-bold text-white tracking-tighter">Real-Time</span>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analytical Sync</span>
             </div>
          </div>
        </div>

        {/* Auth Forms */}
        <div className="flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-md bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 lg:p-14 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] premium-shadow-xl"
          >
            <div className="lg:hidden mb-12 flex justify-center">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-rose-500">
                   <Zap className="w-5 h-5 fill-current" />
                 </div>
                 <span className="font-display font-black text-xl tracking-tighter text-white uppercase">Employee AI</span>
              </div>
            </div>
            <Outlet />
          </motion.div>
        </div>
      </div>
      
      {/* Decorative Branding */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6 opacity-20 whitespace-nowrap">
         <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Hyper-Ledger Production</span>
         <div className="w-20 h-px bg-white/20" />
         <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Neural Mesh v4.0.2</span>
      </div>
    </div>
  );
}
