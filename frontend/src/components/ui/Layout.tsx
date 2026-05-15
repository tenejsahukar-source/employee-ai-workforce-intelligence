import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, glow = false, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.005 }}
      viewport={{ once: true }}
      className={cn(
        "glass-card rounded-[2rem] overflow-hidden",
        glow && "ring-2 ring-rose-500/10 border-rose-500/20",
        props.onClick && "cursor-pointer",
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />
    </motion.div>
  );
}

export const Badge: React.FC<{ children: React.ReactNode, variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info', className?: string }> = ({ children, variant = 'neutral', className }) => {
  const variants = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
    neutral: 'bg-white/5 text-slate-400 border-white/10',
    info: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]',
  };
  
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border leading-none tracking-widest uppercase", variants[variant], className)}>
      {children}
    </span>
  );
}
