import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight, User, Building } from 'lucide-react';

export function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: 'HR Manager'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    navigate('/login');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-10"
    >
      <div className="space-y-3">
        <h2 className="text-4xl font-display font-black tracking-tighter text-white leading-none uppercase italic">JOIN THE NETWORK</h2>
        <p className="text-white/40 font-medium">Request provisioning for your enterprise workforce platform.</p>
      </div>
 
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Full Legal Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-white transition-colors" />
              <input
                type="text"
                required
                placeholder="Sarah Executive"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-white font-bold placeholder:text-white/10 focus:outline-hidden focus:bg-white/[0.05] focus:border-indigo-500/50 transition-all font-mono"
              />
            </div>
          </div>
 
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Work Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-white transition-colors" />
              <input
                type="email"
                required
                placeholder="sarah@aetheriq.ai"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-white font-bold placeholder:text-white/10 focus:outline-hidden focus:bg-white/[0.05] focus:border-indigo-500/50 transition-all font-mono"
              />
            </div>
          </div>
 
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Enterprise Entity</label>
            <div className="relative group">
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-white transition-colors" />
              <input
                type="text"
                required
                placeholder="Global Corp / Tech Giant"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-white font-bold placeholder:text-white/10 focus:outline-hidden focus:bg-white/[0.05] focus:border-indigo-500/50 transition-all font-mono"
              />
            </div>
          </div>
        </div>
 
        <button
          disabled={loading}
          className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-full shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed group hover:scale-[1.02] active:scale-95"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Request Access Key
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowRight className="w-5 h-5" />
              </div>
            </>
          )}
        </button>
      </form>
 
      <div className="text-center">
        <p className="text-slate-500 text-sm font-medium">
          Already have access?{' '}
          <Link to="/login" className="text-white font-bold transition-all underline-offset-4 hover:underline">
            Initialize Session
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
