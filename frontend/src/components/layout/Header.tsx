import React from 'react';
import { Search, Bell, Grid, User, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header className="h-20 border-b border-white/5 px-8 flex items-center justify-between bg-black/40 backdrop-blur-xl sticky top-0 z-40">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-white tracking-tight uppercase leading-none">Intelligence Command</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/20" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">Neural Synchrony: Optimized</span>
          </div>
        </div>
        <div className="h-6 w-px bg-white/10 hidden md:block" />
        <div className="hidden lg:flex items-center gap-4">
           {['Global Insights', 'Risk Matrix', 'Network Nodes'].map(item => (
             <button key={item} className="text-[10px] font-bold text-white/40 hover:text-indigo-400 uppercase tracking-widest transition-colors">
               {item}
             </button>
           ))}
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="relative group hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Search Intelligence Protocols..." 
            className="bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-11 pr-6 text-xs w-64 focus:outline-none focus:border-indigo-500/30 focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-white/20 font-medium"
          />
        </div>

        <div className="flex items-center gap-4">
          <button className="relative w-10 h-10 flex items-center justify-center text-white/40 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-[#05060f] ring-2 ring-indigo-500/20" />
          </button>
          
          <button 
            onClick={() => navigate(`/employees/${user?.id || '1'}`)}
            className="group flex items-center gap-4 pl-4 pr-1 py-1 rounded-2xl border border-transparent hover:border-white/10 hover:bg-white/5 transition-all"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors leading-tight">{user?.name}</div>
              <div className="text-[9px] text-white/40 uppercase tracking-widest font-black mt-0.5">{user?.role}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 p-0.5 shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform duration-300">
               <div className="w-full h-full rounded-[10px] bg-[#1a1b2e] flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-[#1a1b2e] flex items-center justify-center">
                       <User className="w-5 h-5 text-indigo-400" />
                    </div>
                  )}
               </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
