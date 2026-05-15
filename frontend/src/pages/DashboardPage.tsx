import React, { useState, useEffect } from 'react';
import { getEmployees } from "@/services/employeeService";
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Zap, 
  ArrowUpRight, 
  MoreHorizontal,
  PlusCircle,
  ChevronRight,
  FileText,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  Download,
  ThumbsUp
} from 'lucide-react';
import { useEmployees } from '@/context/EmployeeContext';
import { Card, Badge } from '@/components/ui/Layout';
import { cn } from '@/utils/cn';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from 'recharts';
import { motion } from 'framer-motion';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0a0b14]/90 border border-white/10 backdrop-blur-md p-3 rounded-xl shadow-2xl">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">{label}</p>
        <div className="flex flex-col gap-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <span className="text-xs text-slate-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="text-xs font-bold text-white">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { employees, kpis, attritionTrend, departmentData, riskDistribution } = useEmployees();
  const [isExporting, setIsExporting] = useState(false);
  

useEffect(() => {
  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();

      console.log("Backend Employees:", data);

    } catch (error) {
      console.error(error);
    }
  };

  fetchEmployees();
}, []);
 

  const recentHighRisk = [...employees]
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 5)
    .map(emp => ({
      id: emp.id,
      employee: emp.name,
      department: emp.dept,
      score: emp.risk,
      status: emp.risk > 0.7 ? 'High Risk' : emp.risk > 0.3 ? 'Medium Risk' : 'Low Risk'
    }));

  const handleDepartmentClick = (data: any) => {
    if (data && data.name) {
      navigate(`/employees?dept=${encodeURIComponent(data.name)}`);
    }
  };

  const handleEmployeeClick = (id: string) => {
    navigate(`/employees/${id}`);
  };

  const handleNewScan = () => {
    navigate('/predict');
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    // Simple delay instead of real PDF export for now
    await new Promise(r => setTimeout(r, 1000));
    setIsExporting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      id="dashboard-content" 
      className="relative space-y-12 pb-24 p-1 min-h-screen"
    >
      {/* Decorative Atmospheric Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-sky-500/5 blur-[140px] rounded-full pointer-events-none -z-10" />

      {/* Top Navigation / Stats Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-medium text-white tracking-tight leading-tight">Hello Admin!</h1>
          <p className="text-slate-500 text-xs font-medium">Measure How Fast You're Growing Monthly Recurring performance management.</p>
          <h2 className="text-2xl font-display font-bold text-white pt-4">Overview</h2>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex gap-3">
              <button 
                onClick={handleExportPDF}
                disabled={isExporting}
                className="group flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 rounded-full text-xs font-bold transition-all disabled:opacity-50 premium-shadow"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />}
                {isExporting ? 'Processing...' : 'Export Data'}
              </button>
           </div>
        </div>
      </motion.div>

      {/* KPI Cards with Premium Entrance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.1 }}
          >
            <Card className="p-8 relative group" glow={kpi.status === 'danger'}>
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{kpi.label}</span>
                  <div className={cn(
                    "p-2 rounded-lg",
                    kpi.status === 'success' ? "bg-emerald-500/10" : kpi.status === 'danger' ? "bg-rose-500/10" : "bg-indigo-500/10"
                  )}>
                    {kpi.label.includes('Attrition') ? <TrendingUp className="w-4 h-4 text-rose-400" /> : <Users className="w-4 h-4 text-indigo-400" />}
                  </div>
                </div>
                <div className="flex items-end gap-3 mb-6">
                  <span className="text-4xl font-display font-medium tracking-tight text-white">{kpi.value}</span>
                  <div className={cn(
                    "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight mb-2 shadow-sm",
                    kpi.trend.includes('+') ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  )}>
                    {kpi.trend.includes('+') ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {kpi.trend}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    <span>Performance</span>
                    <span>Target: 95%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: idx === 0 ? '12.4%' : idx === 1 ? '65%' : idx === 2 ? '98.2%' : '40%' }}
                      transition={{ duration: 1.5, delay: 0.5 + idx * 0.1 }}
                      className={cn(
                        "h-full rounded-full shadow-[0_0_8px_rgba(255,255,255,0.05)]",
                        idx === 0 ? "bg-rose-500" : idx === 1 ? "bg-indigo-500" : idx === 2 ? "bg-emerald-500" : "bg-indigo-500"
                      )} 
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attrition Trend */}
        <Card className="p-8 lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-display font-bold text-white tracking-tight">Retention Forecast</h3>
            <p className="text-sm text-slate-400 font-medium">Observed historical retention vs projected trend</p>
          </div>
          <div className="flex p-1 bg-white/5 rounded-lg gap-1 border border-white/5">
            <button 
              onClick={() => navigate('/history')}
              className="px-4 py-2 rounded-lg text-[10px] uppercase font-bold tracking-widest text-white/40 transition-all hover:text-white"
            >
              History
            </button>
            <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all shadow-lg shadow-indigo-500/20">
              Current Forecast
            </button>
          </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attritionTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.05}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  unit="%"
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  name="Observed Rate" 
                  stroke="#4f46e5" 
                  strokeWidth={4}
                  dot={{ fill: '#4f46e5', strokeWidth: 2, r: 4, stroke: '#fff' }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3 }}
                  fillOpacity={1} 
                  fill="url(#colorActual)" 
                  animationDuration={2000}
                />
                <Area 
                  type="monotone" 
                  dataKey="predicted" 
                  name="AI Projection" 
                  stroke="#0891b2" 
                  strokeWidth={2}
                  strokeDasharray="8 6"
                  fillOpacity={1} 
                  fill="url(#colorPredicted)" 
                  animationDuration={2500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Risk Distribution - Glass Wheel */}
        <Card className="p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-bold text-white tracking-tight">Risk Distribution</h3>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Global Workforce Cohort</p>
            </div>
          </div>
          
          <div className="flex-1 min-h-[280px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  animationDuration={2000}
                  stroke="none"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 0 ? '#10b981' : index === 1 ? '#f59e0b' : '#f43f5e'} 
                      className="transition-opacity duration-300 hover:opacity-80 outline-none"
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Chip */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="bg-white/5 border border-white/10 p-4 rounded-full shadow-2xl backdrop-blur-md">
                   <div className="flex flex-col items-center">
                      <span className="text-4xl font-display font-bold tracking-tight text-white">{employees.length.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Core Count</span>
                   </div>
                </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3">
             {riskDistribution.map((item, i) => (
               <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.fill }} />
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tight group-hover:text-slate-200">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white">
                      {employees.length > 0 ? (item.value / employees.length * 100).toFixed(1) : 0}%
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-white/20 opacity-0 group-hover:opacity-100 transition-all -translate-y-1" />
                  </div>
               </div>
             ))}
          </div>
        </Card>
      </div>

      {/* Bottom Row - More detailed and spaced */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Department Heatmap */}
        <Card className="p-8">
          <div className="flex items-center justify-between mb-10">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-bold text-white tracking-tight">Risk Concentration Heatmap</h3>
              <p className="text-sm font-medium text-slate-400">Identifying high-vulnerability organizational units</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={departmentData} 
                layout="vertical" 
                margin={{ left: 0, right: 30 }}
                barGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} 
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                  content={<CustomTooltip />}
                />
                <Bar 
                  dataKey="risk" 
                  radius={[0, 20, 20, 0]} 
                  barSize={14}
                  className="cursor-pointer"
                  onClick={handleDepartmentClick}
                >
                  {departmentData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.risk > 70 ? '#f43f5e' : entry.risk > 40 ? '#f59e0b' : '#10b981'} 
                      fillOpacity={0.9}
                      className="hover:fill-opacity-100 transition-all"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Action Priority Table */}
        <Card className="overflow-hidden flex flex-col">
          <div className="p-8 pb-4 flex items-center justify-between">
             <div className="space-y-1">
              <h3 className="text-xl font-display font-bold text-white tracking-tight">Retention Priority Queue</h3>
              <p className="text-sm font-medium text-slate-500">High-risk profiles requiring HR overview and coordination</p>
             </div>
             <button 
                onClick={() => navigate('/employees')}
                className="group flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-indigo-500/20 transition-all"
             >
                Global View
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
             </button>
          </div>
          
          <div className="flex-1 overflow-x-auto px-4 pb-8">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 rounded-2xl">
                  <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest first:rounded-l-2xl last:rounded-r-2xl">Employee</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Department</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Attrition Risk</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">View Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentHighRisk.map((row, idx) => (
                  <motion.tr 
                    key={row.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + idx * 0.05 }}
                    onClick={() => handleEmployeeClick(row.id)}
                    className="hover:bg-white/[0.03] transition-all cursor-pointer group"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <ProfileAvatar 
                          employeeId={row.id} 
                          initials={row.employee.split(' ').map((n: string) => n[0]).join('')} 
                          size="sm"
                          className="border-2 border-white/10 shadow-md ring-1 ring-white/5"
                          editable={false}
                        />
                        <div className="flex flex-col">
                           <span className="text-[14px] font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors uppercase">{row.employee}</span>
                           <span className="text-[10px] font-mono text-white/20">ID-{(8000 + parseInt(row.id)).toString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <Badge variant="neutral" className="bg-white/5 text-slate-400 border-none font-bold text-[9px]">{row.department}</Badge>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex flex-col gap-2">
                         <div className="flex items-center justify-between">
                            <span className={cn("text-[11px] font-bold font-mono", row.score > 0.7 ? "text-rose-400" : "text-indigo-400")}>
                               {(row.score * 100).toFixed(1)}%
                            </span>
                         </div>
                         <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px]">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${row.score * 100}%` }}
                              transition={{ duration: 1.5, delay: 1.2 }}
                              className={cn("h-full rounded-full shadow-[0_0_5px_rgba(255,255,255,0.05)]", row.score > 0.7 ? "bg-rose-500" : "bg-indigo-500")} 
                            />
                         </div>
                       </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/30 group-hover:text-indigo-400 group-hover:border-indigo-500/30 group-hover:shadow-lg group-hover:shadow-indigo-600/10 transition-all">
                          <ArrowUpRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
                       </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
