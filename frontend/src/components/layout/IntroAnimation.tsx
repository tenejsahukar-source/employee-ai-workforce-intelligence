import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Cpu, ShieldCheck, Activity, ChevronRight, Loader2, Database, Zap, Binary } from 'lucide-react';
import { cn } from '@/utils/cn';

interface IntroAnimationProps {
  onComplete: () => void;
}

export function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const [scene, setScene] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress === 25) setScene(1);
    if (progress === 50) setScene(2);
    if (progress === 75) setScene(3);
    if (progress === 100) setScene(4);
  }, [progress]);

  const scenes = [
    {
      title: "Neural Initialization",
      subtitle: "Booting AetherIQ Core...",
      icon: Cpu,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10"
    },
    {
      title: "Mesh Synchronization",
      subtitle: "Connecting to Organizational Data Lake",
      icon: Database,
      color: "text-blue-400",
      bg: "bg-blue-500/10"
    },
    {
      title: "Pattern Extraction",
      subtitle: "Analyzing 42-dimensional Attrition Vectors",
      icon: Binary,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10"
    },
    {
      title: "Intelligence Ready",
      subtitle: "Personnel Mesh Verified",
      icon: ShieldCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#05060f] flex flex-col items-center justify-center overflow-hidden font-display">
      {/* Dynamic Background Grid */}
      <div className="absolute inset-0 opacity-20" 
           style={{ 
             backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)`,
             backgroundSize: '40px 40px' 
           }} 
      />
      
      {/* Animated Glows */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-1/4 -left-1/4 w-[800px] h-[800px] bg-indigo-600/30 blur-[160px] rounded-full pointer-events-none"
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-blue-600/20 blur-[160px] rounded-full pointer-events-none"
      />

      <div className="relative z-10 w-full max-w-xl px-12">
        <AnimatePresence mode="wait">
          {scene < 4 ? (
            <motion.div 
              key={scene}
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              className="space-y-12"
            >
              <div className="flex flex-col items-center text-center space-y-8">
                <div className={cn(
                  "w-24 h-24 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl relative overflow-hidden",
                  scenes[scene].bg
                )}>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-2 border-dashed border-white/5 rounded-3xl"
                  />
                  {React.createElement(scenes[scene].icon, { className: cn("w-10 h-10 transition-colors", scenes[scene].color) })}
                </div>

                <div className="space-y-3">
                  <motion.h2 
                    className="text-4xl font-black text-white uppercase tracking-tighter italic"
                  >
                    {scenes[scene].title}
                  </motion.h2>
                  <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] animate-pulse">
                    {scenes[scene].subtitle}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                  <motion.div 
                    className="h-full bg-linear-to-r from-indigo-600 via-blue-500 to-emerald-400 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                    animate={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-black text-white/20 uppercase tracking-widest font-mono">
                  <span>System: AetherIQ_Build_v4.2</span>
                  <span>{progress}% Optimized</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center space-y-12"
            >
              <div className="relative group">
                <div className="absolute -inset-8 bg-indigo-500/20 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
                <motion.div 
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                  className="w-32 h-32 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center relative shadow-2xl z-10"
                >
                  <BrainCircuit className="w-16 h-16 text-white" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center border-4 border-[#05060f]">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                </motion.div>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-tight">
                  Employee <span className="text-indigo-400">AI</span><br />
                  Workforce Intelligence
                </h1>
                <p className="text-slate-400 font-medium text-lg max-w-sm mx-auto">
                  Platform authenticated. Operational parameters within nominal limits.
                </p>
              </div>

              <button 
                onClick={onComplete}
                className="group relative px-12 py-5 bg-white text-black font-black uppercase tracking-[0.2em] text-xs rounded-full hover:bg-indigo-500 hover:text-white transition-all shadow-2xl shadow-indigo-600/40 flex items-center gap-4 overflow-hidden"
              >
                <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10">Initialize Session</span>
                <div className="relative z-10 w-8 h-8 rounded-full bg-black flex items-center justify-center group-hover:bg-white transition-colors">
                  <ChevronRight className="w-5 h-5 group-hover:text-black transition-colors" />
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Futuristic Accents */}
      <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end">
        <div className="space-y-2 opacity-20">
          <div className="flex gap-1">
            {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-4 bg-white" />)}
          </div>
          <p className="text-[8px] font-black text-white uppercase tracking-widest font-mono">D_SEQ: 8432-ALPHA-9</p>
        </div>
        <div className="text-right opacity-20 font-mono">
           <p className="text-[8px] font-black text-white uppercase tracking-widest">Protocol: Enterprise_Secure_V3</p>
           <p className="text-[8px] font-black text-white uppercase tracking-widest">Latency: 12ms</p>
        </div>
      </div>
    </div>
  );
}
