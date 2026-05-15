import React, { useState } from 'react';
import { loginUser } from "@/services/authService";
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {

      console.log("EMAIL:", email);
      console.log("PASSWORD:", password);

      const response = await loginUser(
        email,
        password
      );

      localStorage.setItem(
        "token",
        response.access_token
      );

      console.log("Login Success:", response);

      window.location.href = "/dashboard";

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <div className="space-y-3">
        <h2 className="text-4xl font-display font-black tracking-tighter text-white leading-none uppercase italic">Sign In</h2>
        <p className="text-white/40 font-medium">Access your enterprise AI workforce console.</p>
      </div>
 
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Identity Protocol</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-white transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="executive@enterprise.ai"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-white font-bold placeholder:text-white/10 focus:outline-hidden focus:bg-white/[0.05] focus:border-indigo-500/50 transition-all font-mono"
              />
            </div>
          </div>
 
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest px-1">Neural Access Key</label>
              <button type="button" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-tight">Recover Key</button>
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-white transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-white font-bold placeholder:text-white/10 focus:outline-hidden focus:bg-white/[0.05] focus:border-indigo-500/50 transition-all font-mono"
              />
            </div>
          </div>
        </div>
 
        <div className="flex items-center gap-3">
          <input type="checkbox" className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500/20 transition-all cursor-pointer" />
          <span className="text-xs text-white/30 font-bold uppercase tracking-widest">Protocol Persistence</span>
        </div>

        <button
          disabled={isLoading}
          className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-full shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed group hover:scale-[1.02] active:scale-95"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Launch Intelligence Console
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowRight className="w-5 h-5" />
              </div>
            </>
          )}
        </button>
      </form>

      <div className="text-center">
        <p className="text-slate-500 text-sm font-medium">
          New to the enterprise?{' '}
          <Link to="/register" className="text-white font-bold transition-all underline-offset-4 hover:underline">
            Request Provisioning
          </Link>
        </p>
      </div>

      {/* Trust Badges */}
      <div className="pt-8 grid grid-cols-3 gap-4 opacity-30">
        {[ 'SOC2_TYPE_II', 'GDPR_TRUST', 'AES_256_V3' ].map(badge => (
          <div key={badge} className="px-1 py-2 border border-white/10 rounded-lg flex items-center justify-center">
             <span className="text-[8px] font-black text-white uppercase tracking-widest">{badge}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}