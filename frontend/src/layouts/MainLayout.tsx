import React from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

export function MainLayout() {
  return (
    <div className="flex min-h-screen bg-[#02030a] text-slate-300 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col bg-transparent">
          {/* Subtle Atmosphere */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/[0.08] rounded-full blur-[120px] -z-10" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-600/[0.05] rounded-full blur-[120px] -z-10" />
          
          <div className="p-10 w-full flex-1">
            <motion.div
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </div>

          {/* Footer / Status Bar - Premium Polish */}
          <footer className="h-10 border-t border-white/5 px-10 flex items-center justify-between bg-black/40 backdrop-blur-md text-[10px] text-slate-500 font-black tracking-widest uppercase shrink-0">
            <div className="flex gap-6">
              <span className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse"></span>
                ACTIVE NODE: PROD_AETHER_01
              </span>
              <span className="opacity-60">LATENCY: 12ms</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-2 py-0.5 rounded bg-white/5 text-emerald-400 border border-white/10 flex items-center gap-1.5 group">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                <span>CORE_STABLE</span>
              </div>
              <span className="opacity-60">v1.2.4-NEURAL</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
