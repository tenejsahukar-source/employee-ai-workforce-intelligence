import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  Brain, 
  LineChart, 
  ArrowRight,
  Sparkles,
  Search,
  Activity,
  Cpu,
  Network
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface CinematicSplashProps {
  onComplete: () => void;
}

const PHASES = [
  {
    title: "Control Your",
    titleAccent: "Workforce",
    subtitle: "Manifest Your Results",
    description: "Experience the next generation of AI-powered workforce intelligence. Predict attrition, understand patterns, and retain your core talent with neural precision.",
    icon: Brain,
    color: "from-indigo-500 to-purple-600"
  },
  {
    title: "Upgrade Your",
    titleAccent: "Intelligence",
    subtitle: "Neural Mesh v4.0",
    description: "Our advanced AI personalizes your workforce journey, clears operational blocks, and aligns your organization with its highest potential.",
    icon: TrendingUp,
    color: "from-purple-500 to-pink-600"
  }
];

const FEATURES = [
  { label: 'AI Attrition Prediction', icon: Activity, x: -280, y: -150, delay: 0.1 },
  { label: 'Workforce Analytics', icon: LineChart, x: 300, y: -100, delay: 0.2 },
  { label: 'AI HR Copilot', icon: Sparkles, x: -320, y: 150, delay: 0.3 },
  { label: 'Risk Intelligence', icon: ShieldCheck, x: 280, y: 180, delay: 0.4 },
  { label: 'Neural Mapping', icon: Network, x: 0, y: -250, delay: 0.5 },
];

export const CinematicSplash: React.FC<CinematicSplashProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'intro' | 'features'>('intro');
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const textInterval = setInterval(() => {
      setCurrentTextIndex(prev => {
        if (prev === PHASES.length - 1) {
          clearInterval(textInterval);
          setTimeout(() => setPhase('features'), 1500);
          return prev;
        }
        return prev + 1;
      });
    }, 2500);

    return () => clearInterval(textInterval);
  }, []);

  const handleLaunch = () => {
    setIsExiting(true);
    setTimeout(onComplete, 1600);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020205] overflow-hidden flex items-center justify-center font-sans perspective-2000">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        {/* Crisp Moon/Planet Element in Background */}
        <motion.div
           style={{ x: mousePos.x, y: mousePos.y }}
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 4, ease: [0.22, 1, 0.36, 1] }}
           className="absolute top-[-5%] right-[-5%] w-[1100px] h-[1100px] pointer-events-none"
        >
           {/* Deep glow layer */}
           <div className="absolute inset-0 rounded-full bg-linear-to-br from-indigo-500/30 via-purple-500/10 to-transparent blur-[140px] mix-blend-plus-lighter" />
           
           {/* Crisp texture layer */}
           <img 
             src="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2600&auto=format&fit=crop" 
             alt="" 
             className="absolute inset-0 w-full h-full object-cover rounded-full opacity-60 mix-blend-screen grayscale brightness-150 contrast-150"
             referrerPolicy="no-referrer"
           />
           
           {/* Atmosphere/Limb layer */}
           <div className="absolute inset-0 rounded-full shadow-[inset_-30px_0_100px_rgba(255,255,255,0.3),inset_30px_0_150px_rgba(0,0,0,0.9)]" />
           <div className="absolute inset-0 rounded-full ring-1 ring-white/20 blur-[2px]" />
        </motion.div>

        {/* Ambient Nebula Gradients */}
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.4, 0.3],
            x: [0, 30, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[5%] w-[70%] h-[70%] bg-indigo-600/15 blur-[180px] rounded-full mix-blend-screen" 
        />
        <motion.div 
          animate={{ 
            scale: [1.1, 1, 1.1],
            opacity: [0.2, 0.3, 0.2],
            x: [0, -20, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[5%] w-[60%] h-[60%] bg-purple-600/15 blur-[180px] rounded-full mix-blend-screen" 
        />
        
        {/* High-Contrast Grid lines */}
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:120px_120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020205_90%)]" />
      </div>

      <AnimatePresence mode="wait">
        {phase === 'intro' ? (
          <motion.div 
            key={currentTextIndex}
            initial={{ opacity: 0, x: -50, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
            className="relative z-20 max-w-6xl w-full px-12 text-left"
          >
            <div className="space-y-10">
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.3 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-6 mb-2">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/20 flex items-center justify-center backdrop-blur-3xl shadow-2xl shadow-indigo-500/20">
                    {(() => {
                      const Icon = PHASES[currentTextIndex].icon;
                      return <Icon className="w-8 h-8 text-indigo-400" />;
                    })()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.5em] leading-none mb-1">
                      {PHASES[currentTextIndex].subtitle}
                    </span>
                    <div className="h-1 w-24 bg-indigo-500/30 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: "0%" }}
                         animate={{ width: "100%" }}
                         transition={{ duration: 4, ease: "linear" }}
                         className="h-full bg-indigo-400"
                       />
                    </div>
                  </div>
                </div>
                <h2 className="text-8xl md:text-[10rem] font-display font-black tracking-tighter text-white leading-[0.8] uppercase select-none">
                  {PHASES[currentTextIndex].title} <br />
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-white via-indigo-400 to-purple-500 italic drop-shadow-sm">
                    {PHASES[currentTextIndex].titleAccent}
                  </span>
                </h2>
              </motion.div>

              <motion.p 
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.6 }}
                className="text-2xl md:text-3xl text-slate-400 font-medium max-w-3xl leading-relaxed tracking-tight"
              >
                {PHASES[currentTextIndex].description}
              </motion.p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-20 w-full h-full flex flex-col items-center justify-center p-12"
          >
            {/* Cinematic Dashboard Reveal with enhanced Bloom */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0, rotateX: 30, y: 100 }}
              animate={isExiting ? { scale: 1.8, opacity: 0, filter: "blur(60px)", y: -100 } : { scale: 1, opacity: 1, rotateX: 0, y: 0 }}
              transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-6xl h-[650px] perspective-3000"
            >
              {/* Outer Glow */}
              <div className="absolute -inset-10 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

              <div className="w-full h-full bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[4rem] p-16 shadow-[0_80px_150px_-30px_rgba(0,0,0,1)] overflow-hidden relative group">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-16">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-[2rem] bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-600/50">
                        <Zap className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-2xl font-display font-black text-white uppercase tracking-tight">Enterprise Core</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                             <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mt-0.5">Neural Linked</span>
                          </div>
                          <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Protocol v4.0.2</span>
                        </div>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      {[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white/10" />)}
                   </div>
                </div>

                <div className="grid grid-cols-12 gap-10 h-full">
                  <div className="col-span-8 space-y-10 text-left">
                     <div className="grid grid-cols-2 gap-8">
                        <motion.div 
                          whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.05)" }}
                          className="h-44 rounded-[2.5rem] bg-indigo-600/10 border border-indigo-500/20 p-10 flex flex-col justify-between transition-colors cursor-pointer"
                        >
                           <span className="text-[12px] font-black text-indigo-300 uppercase tracking-[0.3em] leading-none mb-2">Model Fidelity</span>
                           <span className="text-6xl font-display font-black text-white tracking-tighter">98.4<span className="text-2xl opacity-40 ml-1">%</span></span>
                        </motion.div>
                        <motion.div 
                          whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.06)" }}
                          className="h-44 rounded-[2.5rem] bg-white/[0.03] border border-white/10 p-10 flex flex-col justify-between transition-colors cursor-pointer"
                        >
                           <span className="text-[12px] font-black text-white/40 uppercase tracking-[0.3em] leading-none mb-2">Sync Nodes</span>
                           <span className="text-6xl font-display font-black text-white tracking-tighter">12.8<span className="text-2xl opacity-40 ml-1">K</span></span>
                        </motion.div>
                     </div>
                     <div className="h-64 rounded-[2.5rem] bg-white/[0.01] border border-white/5 p-10 relative overflow-hidden group/chart">
                        <div className="flex items-center justify-between mb-8">
                          <span className="text-[12px] font-black text-white/30 uppercase tracking-[0.3em]">Network Convergence Drift</span>
                          <div className="w-12 h-1 bg-white/10 rounded-full" />
                        </div>
                        <div className="flex items-end gap-3.5 h-32">
                           {[65, 45, 85, 55, 95, 75, 50, 90, 65, 80, 55, 70].map((h, i) => (
                             <motion.div
                               key={i}
                               initial={{ scaleY: 0 }}
                               animate={{ scaleY: 1 }}
                               transition={{ delay: 1.2 + i * 0.08, duration: 1.2, ease: [0.33, 1, 0.68, 1] }}
                               className="flex-1 bg-linear-to-t from-indigo-500/10 via-indigo-400/40 to-white/30 rounded-t-xl origin-bottom group-hover/chart:opacity-80 transition-opacity"
                               style={{ height: `${h}%` }}
                             />
                           ))}
                        </div>
                     </div>
                  </div>
                  <div className="col-span-4 rounded-[2.5rem] bg-white/[0.02] border border-white/10 p-10 text-left">
                     <div className="flex items-center justify-between mb-8">
                       <span className="text-[12px] font-black text-white/30 uppercase tracking-[0.3em]">Process Streams</span>
                       <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
                     </div>
                     <div className="space-y-6">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="flex items-center gap-6 group/item">
                             <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <Cpu className="w-4 h-4 text-indigo-400/50" />
                             </div>
                             <div className="flex-1 space-y-2">
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                   <motion.div 
                                      initial={{ x: "-100%" }}
                                      animate={{ x: "0%" }}
                                      transition={{ duration: 2, delay: 1.5 + i * 0.2, repeat: Infinity, repeatDelay: 3 }}
                                      className="h-full bg-indigo-500/40 w-1/2" 
                                   />
                                </div>
                                <div className="h-1 w-1/2 bg-white/5 rounded-full" />
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Orbiting Feature Tiles */}
              {FEATURES.map((feat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.8 }}
                  animate={{ opacity: 1, x: feat.x, y: feat.y, scale: 1 }}
                  whileHover={{ scale: 1.05, filter: "brightness(1.2)" }}
                  transition={{ 
                    delay: 2 + feat.delay, 
                    duration: 1.5,
                    opacity: { duration: 1 },
                    scale: { duration: 1.2, ease: [0.34, 1.56, 0.64, 1] },
                    x: { duration: 1.5, ease: [0.34, 1.56, 0.64, 1] },
                    y: { duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }
                  }}
                  className="absolute p-6 px-10 glass-card rounded-[2rem] border border-white/20 flex items-center gap-6 shadow-2xl backdrop-blur-3xl shadow-indigo-900/20 cursor-default"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400">
                    <feat.icon className="w-7 h-7" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-black text-white uppercase tracking-[0.3em] whitespace-nowrap leading-none shadow-sm">
                      {feat.label}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Premium Final Launch Button */}
            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 3.5, duration: 1 }}
               className="mt-20 flex flex-col items-center gap-10"
            >
               <motion.button
                 whileHover={{ scale: 1.05, y: -5 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={handleLaunch}
                 className="relative group h-20 px-12 flex items-center justify-center overflow-hidden rounded-full shadow-[0_30px_60px_-15px_rgba(79,70,229,0.5)]"
               >
                 <div className="absolute inset-0 bg-indigo-600 transition-colors group-hover:bg-indigo-500 ring-2 ring-white/20 group-hover:ring-white/40" />
                 <div className="relative flex items-center gap-4">
                    <span className="text-lg font-display font-black text-white uppercase tracking-[0.4em] ml-2">Initialize Console</span>
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                       <ArrowRight className="w-5 h-5 text-white" />
                    </div>
                 </div>
               </motion.button>

               <div className="flex items-center gap-4 text-white/30 font-black text-[10px] uppercase tracking-[0.5em]">
                  <span>Authorized Personnel Only</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span>Protocol v4.0.2</span>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        whileHover={{ opacity: 1, x: 5 }}
        onClick={handleLaunch}
        className="fixed bottom-12 right-12 z-[100] flex items-center gap-4 text-[10px] font-black text-white uppercase tracking-[0.3em] group transition-opacity"
      >
        Skip Experience
        <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:border-indigo-500 group-hover:bg-indigo-500/10 transition-all">
          <ArrowRight className="w-4 h-4 text-white" />
        </div>
      </motion.button>
    </div>
  );
};
