import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  BrainCircuit, 
  BarChart3, 
  Users, 
  History, 
  Settings, 
  LogOut, 
  Bell, 
  Menu,
  ChevronRight,
  Zap,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';

const MENU_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: BrainCircuit, label: 'Predict Attrition', path: '/predict' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Activity, label: 'Explainability', path: '/explain' },
  { icon: Users, label: 'Employee Records', path: '/employees' },
  { icon: History, label: 'Prediction History', path: '/history' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: ShieldCheck, label: 'System Monitoring', path: '/monitoring' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative z-50 h-screen bg-[#05060f] border-r border-white/5 flex flex-col premium-shadow"
    >
      {/* Logo Section */}
      <div className="p-8 flex items-center gap-3">
        <div className="flex items-center">
          <span className="font-display font-black text-2xl tracking-tighter text-white leading-none italic">Aether</span>
          <span className="font-display font-black text-2xl tracking-tighter text-indigo-500 leading-none">IQ</span>
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-2 whitespace-nowrap"
            >
              Console
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-24 w-8 h-8 rounded-xl bg-[#0a0b14] border border-white/10 flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all z-10 premium-shadow group"
      >
        <ChevronRight className={cn("w-4 h-4 transition-transform duration-500 group-hover:scale-110", !isCollapsed && "rotate-180")} />
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-6 py-6 space-y-1 overflow-y-auto no-scrollbar">
        {MENU_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "group relative flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-500",
              isActive 
                ? "bg-white/10 text-white premium-shadow-sm border border-white/10" 
                : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500",
              "group-hover:bg-white/5 group-hover:premium-shadow-sm"
            )}>
              <item.icon className={cn("w-4.5 h-4.5 shrink-0 transition-all duration-500")} />
            </div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-bold text-[13px] tracking-tight uppercase whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Security Level / Logout */}
      <div className="p-6 border-t border-white/5 flex flex-col gap-4">
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-500 group font-bold tracking-tight text-[11px] uppercase tracking-widest",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
