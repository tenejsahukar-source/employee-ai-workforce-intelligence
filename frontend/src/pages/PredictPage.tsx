import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BrainCircuit, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Info, 
  Loader2, 
  AlertCircle,
  FileText,
  Briefcase,
  Calendar,
  Wallet
} from 'lucide-react';
import { Card, Badge } from '@/components/ui/Layout';
import { cn } from '@/utils/cn';

const STEPS = [
  { id: 1, title: 'Employee Basics', icon: Briefcase },
  { id: 2, title: 'Engagement Metrics', icon: Calendar },
  { id: 3, title: 'Compensation', icon: Wallet },
  { id: 4, title: 'AI Analysis', icon: BrainCircuit },
];

export function PredictPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictionResult, setPredictionResult] = useState<null | { score: number, risk: string }>(null);

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    // Simulate deep neural analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    setPredictionResult({ score: 0.82, risk: 'High' });
    setIsAnalyzing(false);
    handleNext();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-12 pb-24 relative"
    >
      {/* Background Decor */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-[2px] bg-indigo-500 rounded-full" />
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Predictive Engine</span>
        </div>
        <h1 className="text-4xl font-display font-bold text-white tracking-tight leading-tight">Neural Attrition Analysis</h1>
        <p className="text-slate-400 font-medium max-w-xl">Configure target parameters to execute high-fidelity ML attrition risk modeling.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between px-8 py-6 bg-white/5 border border-white/10 rounded-2xl premium-shadow relative overflow-hidden">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-0.5 bg-white/5 -z-0 mx-20" />
        {STEPS.map((step) => (
          <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
            <motion.div 
              animate={{ 
                scale: currentStep === step.id ? 1.1 : 1,
                backgroundColor: currentStep >= step.id ? '#4f46e5' : 'rgba(255,255,255,0.05)'
              }}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-sm",
                currentStep >= step.id 
                  ? "border-indigo-500 shadow-indigo-600/40" 
                  : "border-white/5 text-slate-500"
              )}
            >
              {currentStep > step.id ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : (
                <step.icon className={cn("w-5 h-5", currentStep === step.id ? "text-white" : "text-slate-500")} />
              )}
            </motion.div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest", 
              currentStep >= step.id ? "text-indigo-400" : "text-slate-500"
            )}>
              {step.title}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={currentStep}
           initial={{ opacity: 0, scale: 0.98, y: 10 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 1.02, y: -10 }}
           transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
           className="min-h-[400px]"
        >
          {currentStep === 1 && (
            <Card className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 md:col-span-2">
                   <label className="text-xs font-bold text-white/30 uppercase tracking-widest px-1">Employee Context Target</label>
                   <input type="text" placeholder="Full Legal Name" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-hidden transition-all placeholder:text-white/20" />
                </div>
                <div className="space-y-3">
                   <label className="text-xs font-bold text-white/30 uppercase tracking-widest px-1">Organizational Unit</label>
                   <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-hidden transition-all appearance-none cursor-pointer">
                      <option className="bg-[#05060f]">Engineering Spectrum</option>
                      <option className="bg-[#05060f]">Revenue Generation</option>
                      <option className="bg-[#05060f]">Growth & Marketing</option>
                      <option className="bg-[#05060f]">Core Product Strategy</option>
                   </select>
                </div>
                <div className="space-y-3">
                   <label className="text-xs font-bold text-white/30 uppercase tracking-widest px-1">Seniority Index</label>
                   <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-hidden transition-all appearance-none cursor-pointer">
                      <option className="bg-[#05060f]">L3 - Individual Contributor</option>
                      <option className="bg-[#05060f]">L5 - Staff Specialist</option>
                      <option className="bg-[#05060f]">L7 - Strategic Leadership</option>
                      <option className="bg-[#05060f]">M1 - Operational Management</option>
                   </select>
                </div>
                <div className="space-y-3">
                   <label className="text-xs font-bold text-white/30 uppercase tracking-widest px-1">Tenure (Cycles)</label>
                   <input type="number" placeholder="Enter years" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-hidden transition-all" />
                </div>
                <div className="space-y-3">
                   <label className="text-xs font-bold text-white/30 uppercase tracking-widest px-1">Last Progression Delta</label>
                   <input type="number" placeholder="Months since last promotion" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-hidden transition-all" />
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex gap-4 shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                 <BrainCircuit className="w-6 h-6 text-indigo-400 shrink-0 group-hover:rotate-12 transition-transform" />
                 <p className="text-xs text-slate-300 leading-relaxed font-semibold">Intelligence Note: Historical variance within this department suggests a 14.2% higher risk threshold for Staff levels compared to junior roles.</p>
              </div>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="p-10 space-y-10">
               <div className="space-y-10">
                  <div className="space-y-6">
                     <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-white/30 uppercase tracking-widest px-1">Internal Satisfaction Index</label>
                          <p className="text-[10px] text-white/20 font-medium uppercase">Self-reported vs observed engagement</p>
                        </div>
                        <span className="text-2xl font-display font-bold text-indigo-400 tracking-tighter">7.0<span className="text-sm text-white/20">/10</span></span>
                     </div>
                     <input type="range" className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-indigo-500" />
                  </div>
                  
                  <div className="space-y-6">
                     <div className="flex justify-between items-end">
                        <div className="space-y-1">
                           <label className="text-xs font-bold text-white/30 uppercase tracking-widest px-1">Operational Intensity</label>
                           <p className="text-[10px] text-white/20 font-medium uppercase">Average daily capacity exceedance</p>
                        </div>
                        <span className="text-2xl font-display font-bold text-indigo-400 tracking-tighter">2.5<span className="text-sm text-white/20">hrs</span></span>
                     </div>
                     <input type="range" className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-indigo-500" />
                  </div>
 
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-white/30 uppercase tracking-widest px-1">Audit Consensus</label>
                       <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-hidden focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                          <option className="bg-[#05060f]">Exceeds Performance Baseline</option>
                          <option className="bg-[#05060f]">Meets Operational Standard</option>
                          <option className="bg-[#05060f]">Sub-Optimal Regression</option>
                       </select>
                    </div>
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-white/30 uppercase tracking-widest px-1">Systemic Balance</label>
                       <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-hidden focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                          <option className="bg-[#05060f]">Sustainable Balance</option>
                          <option className="bg-[#05060f]">Nominal Deviation</option>
                          <option className="bg-[#05060f]">High Attrition Risk Factors</option>
                       </select>
                    </div>
                  </div>
               </div>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                   <label className="text-xs font-bold text-white/30 uppercase tracking-widest px-1">Annual Compensation (USD)</label>
                   <input type="number" placeholder="Enter aggregate salary" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-hidden focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-3">
                   <label className="text-xs font-bold text-white/30 uppercase tracking-widest px-1">Equity Vesting Delta (%)</label>
                   <input type="number" placeholder="Percentage vested" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-hidden focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-3">
                   <label className="text-xs font-bold text-white/30 uppercase tracking-widest px-1">Commute Impact Score</label>
                   <input type="number" placeholder="Relocation index / Miles" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-hidden focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-3">
                   <label className="text-xs font-bold text-white/30 uppercase tracking-widest px-1">Mobility Frequency</label>
                   <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-hidden focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                      <option className="bg-[#05060f]">Zero Mobility Required</option>
                      <option className="bg-[#05060f]">Nominal Strategic Travel</option>
                      <option className="bg-[#05060f]">High Mobility Frequency</option>
                   </select>
                </div>
              </div>
            </Card>
          )}

          {currentStep === 4 && (
            <div className="space-y-8">
               <Card className="p-12 md:p-20 flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden">
                {/* Visual Flair for Analysis */}
                <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-transparent via-indigo-500/20 to-transparent" />
                
                {isAnalyzing ? (
                  <>
                    <div className="relative">
                      <div className="w-32 h-32 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center animate-pulse shadow-inner">
                         <BrainCircuit className="w-14 h-14 text-indigo-400" />
                      </div>
                      <div className="absolute -inset-4 border-2 border-dashed border-indigo-500/20 rounded-[2.5rem] animate-[spin_10s_linear_infinite]" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-3xl font-display font-bold text-white tracking-tight leading-tight">Active Neural Extraction</h3>
                      <p className="text-slate-400 font-medium max-w-sm">Correlating 42 high-dimension data points against 120,000 organizational signals.</p>
                    </div>
                    <div className="w-full max-w-xs h-2 bg-white/5 rounded-full overflow-hidden mt-4 p-[1px]">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 3, ease: "easeInOut" }}
                        className="h-full bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.5)]"
                       />
                    </div>
                  </>
                ) : predictionResult ? (
                  <>
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-24 h-24 rounded-[2rem] bg-rose-500/10 flex items-center justify-center mb-2 shadow-sm border border-rose-500/20"
                    >
                      <AlertCircle className="w-12 h-12 text-rose-400" />
                    </motion.div>
                    <div className="space-y-3">
                      <div className="flex flex-col items-center gap-2">
                        <Badge variant="danger" className="px-4 py-1.5 text-[11px] font-black tracking-[0.2em] bg-transparent border-rose-500/30">Critical Vulnerability</Badge>
                        <h3 className="text-6xl font-display font-bold text-white tracking-tighter">82.4<span className="text-2xl text-white/20">%</span></h3>
                      </div>
                      <p className="text-slate-400 font-medium mt-4 max-w-md">Target profile shows extreme characteristic convergence with high-risk attrition groups in Engineering Spectrum.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 pt-8">
                       <button onClick={() => setCurrentStep(1)} className="group flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-slate-300 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all premium-shadow">
                         <FileText className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                         Save Audit PDF
                       </button>
                       <button className="flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95">
                         Executive Summary
                         <ChevronRight className="w-5 h-5" />
                       </button>
                    </div>
                  </>
                ) : (
                  <div className="py-12 space-y-8">
                     <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-white/10">
                        <BrainCircuit className="w-12 h-12 text-white/10" />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-2xl font-display font-bold text-white tracking-tight uppercase leading-none">Intelligence Ready</h3>
                        <p className="text-slate-500 font-medium">Model initialized. Trigger extraction to generate risk probability.</p>
                     </div>
                     <button 
                       onClick={runAnalysis}
                       className="group px-16 py-5 bg-linear-to-r from-indigo-600 to-indigo-500 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-[11px] hover:scale-105 transition-all shadow-2xl shadow-indigo-600/30 flex items-center gap-3 mx-auto"
                     >
                       Execute Predictive Cycle
                       <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                     </button>
                  </div>
                )}
               </Card>
 
               {predictionResult && (
                 <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                 >
                    <Card className="p-8 border-l-4 border-l-emerald-500 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                          <Wallet className="w-24 h-24 text-emerald-500" />
                       </div>
                       <Badge variant="success" className="mb-4 bg-emerald-500/10 text-emerald-400 border-none">Economic Strategy</Badge>
                       <h4 className="text-xl font-display font-bold text-white mb-2 uppercase tracking-tight">Compensation Realignment</h4>
                       <p className="text-sm text-slate-400 leading-relaxed font-medium">Compensation sits 15.4% below department average for Staff Specialist roles. Immediate equity refresh recommended to mitigate fiscal-driven attrition.</p>
                    </Card>
                    <Card className="p-8 border-l-4 border-l-amber-500 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                          <Calendar className="w-24 h-24 text-amber-500" />
                       </div>
                       <Badge variant="warning" className="mb-4 bg-amber-500/10 text-amber-400 border-none">Engagement Strategy</Badge>
                       <h4 className="text-xl font-display font-bold text-white mb-2 uppercase tracking-tight">Direct Intervention Hub</h4>
                       <p className="text-sm text-slate-400 leading-relaxed font-medium">Operational intensity is high. Strategic leadership synchronization required within 48 hours to discuss burnout risk and capacity reallocation.</p>
                    </Card>
                 </motion.div>
               )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer Navigation */}
      {currentStep < 4 && (
        <div className="flex items-center justify-between pt-12">
          <button 
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-3 px-8 py-3 rounded-2xl text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all font-bold uppercase tracking-widest text-[10px]"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous Node
          </button>
          <button 
            onClick={handleNext}
            className="group flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-600/20"
          >
            Progress Execution
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
