import React, { useState, useEffect, useMemo } from 'react';
import { Card, Badge } from '@/components/ui/Layout';
import { 
  ArrowLeft, 
  Mail, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Clock, 
  Users,
  ShieldAlert,
  Award,
  Camera,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  TrendingUp,
  History,
  Zap,
  ArrowRight,
  Plus,
  X,
  Target,
  FileText,
  Phone,
  BarChart3,
  Activity,
  Heart,
  DollarSign,
  UserCheck,
  Flame,
  Brain,
  ChevronRight,
  AlertTriangle,
  Info,
  Lock,
  Eye,
  MoreVertical,
  Star,
  Globe,
  Flag,
  Coffee,
  Plane,
  Watch
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { useEmployees, Employee } from '@/context/EmployeeContext';
import { useAuth } from '@/context/AuthContext';

const PERFORMANCE_DATA = [
  { month: 'Jan', score: 85 },
  { month: 'Feb', score: 82 },
  { month: 'Mar', score: 88 },
  { month: 'Apr', score: 91 },
  { month: 'May', score: 89 },
  { month: 'Jun', score: 92 },
];

const SALARY_DATA = [
  { year: '2021', salary: 110 },
  { year: '2022', salary: 125 },
  { year: '2023', salary: 138 },
  { year: '2024', salary: 152 },
];

const ATTENDANCE_HEATMAP = Array.from({ length: 7 }, (_, i) => 
  Array.from({ length: 24 }, (_, j) => ({
    day: i,
    hour: j,
    value: Math.random() > 0.1 ? Math.floor(Math.random() * 100) : 0
  }))
).flat();

const SHAP_FACTORS = [
  { factor: 'Overtime', value: 0.35, type: 'negative' },
  { factor: 'Salary', value: -0.15, type: 'positive' },
  { factor: 'Manager Tenure', value: 0.22, type: 'negative' },
  { factor: 'Distance from Home', value: 0.18, type: 'negative' },
  { factor: 'Department Growth', value: -0.25, type: 'positive' },
];

const getRetentionActions = (risk: number) => {
  if (risk > 0.7) {
    return [
      {
        id: 1,
        title: "Immediate Compensation Review",
        description: "Surge in risk correlates with market salary shifts. Recommend 10-15% equity refresh or immediate base adjustment.",
        impact: "High",
        timeframe: "48 Hours"
      },
      {
        id: 2,
        title: "Executive Connection",
        description: "Schedule a 1-on-1 with the SVP of Engineering to discuss long-term roadmap influence and career progression.",
        impact: "Medium",
        timeframe: "1 Week"
      },
      {
        id: 3,
        title: "Role Diversification",
        description: "Assign as a mentor for the upcoming 'Cloud Native' initiative to increase institutional stickiness and prestige.",
        impact: "High",
        timeframe: "Next Cycle"
      }
    ];
  } else if (risk > 0.4) {
    return [
      {
        id: 1,
        title: "Career Path Mapping",
        description: "Focus on long-term role evolution. Define a clear path to Principal level within the next 18 months.",
        impact: "Medium",
        timeframe: "2 Weeks"
      },
      {
        id: 2,
        title: "Upskilling Allowance",
        description: "Grant additional budget for external certifications or conference attendance to re-engage technical interest.",
        impact: "Low",
        timeframe: "Flexible"
      },
      {
        id: 3,
        title: "Mentorship Pairing",
        description: "Pair with a senior architect to explore cross-functional architecture roles.",
        impact: "Medium",
        timeframe: "1 Month"
      }
    ];
  } else {
    return [
      {
        id: 1,
        title: "Contribution Recognition",
        description: "Publicly recognize recent project success in the next all-hands meeting to reinforce positive alignment.",
        impact: "Low",
        timeframe: "Monthly"
      },
      {
        id: 2,
        title: "Growth Check-in",
        description: "Bi-annual review of professional development goals to ensure continued alignment with company vision.",
        impact: "Low",
        timeframe: "90 Days"
      }
    ];
  }
};

export function EmployeeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { employees, updateEmployee } = useEmployees();
  const { user: currentUser } = useAuth();
  
  const employee = useMemo(() => {
    const base = employees.find(e => e.id === id) || employees[0];
    // Fill in default values if they don't exist for the UI
    return {
      ...base,
      workLocation: base.workLocation || 'San Francisco, HQ',
      employmentType: base.employmentType || 'Full-time',
      status: base.status || (base.risk > 0.7 ? 'High Risk' : 'Active'),
      performanceScore: base.performanceScore || Math.floor(Math.random() * 20) + 75,
      satisfactionLevel: base.satisfactionLevel || Math.floor(Math.random() * 30) + 60,
      salaryBand: base.salaryBand || '$140k - $165k',
      promotionReadiness: base.promotionReadiness || Math.floor(Math.random() * 50) + 40,
      attendanceScore: base.attendanceScore || Math.floor(Math.random() * 10) + 90,
      burnoutRisk: base.burnoutRisk || Math.floor(Math.random() * 40) + (base.risk * 100 * 0.5),
      engagementScore: base.engagementScore || Math.floor(Math.random() * 30) + 65,
      age: base.age || 32,
      gender: base.gender || 'Female',
      education: base.education || "Master's in Computer Science",
      maritalStatus: base.maritalStatus || 'Single',
      yearsInRole: base.yearsInRole || '2.4 yrs',
      teamSize: base.teamSize || 12,
      travelFrequency: base.travelFrequency || 'Rarely',
      overtimeStatus: base.overtimeStatus || 'Occasional',
    } as Required<Employee>;
  }, [employees, id]);

  const isSelf = currentUser?.id === employee.id;
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState(employee);

  useEffect(() => {
    setEditedEmployee(employee);
  }, [employee]);

  const [interventionScheduled, setInterventionScheduled] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative space-y-12 pb-24"
    >
      {/* Dynamic Background Atmosphere */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-purple-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Navigation & Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <button 
          onClick={() => navigate('/employees')}
          className="flex items-center gap-3 text-slate-500 hover:text-indigo-400 transition-all group w-fit"
        >
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center premium-shadow group-hover:border-indigo-500/30 transition-all">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </div>
          <div className="flex flex-col items-start translate-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] leading-none mb-1 text-white/30">Navigation</span>
            <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Back to Network Nodes</span>
          </div>
        </button>
        
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl premium-shadow">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-[#05060f] bg-white/10 overflow-hidden shadow-sm" />
              ))}
            </div>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-2">3 Stakeholders Reviewing</span>
          </div>
          <button className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-slate-500 hover:text-white premium-shadow transition-all group">
            <MoreVertical className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      </div>

      {/* Main Profile Identity Deck */}
      <Card className="relative overflow-hidden p-0 border-none bg-transparent premium-shadow-lg">
        <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-3xl -z-10" />
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10" />
        
        <div className="p-10 lg:p-12 flex flex-col lg:flex-row gap-12 items-start lg:items-center relative">
          <div className="relative shrink-0">
            <div className="absolute -inset-6 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none" />
            <ProfileAvatar 
              employeeId={employee.id} 
              initials={employee.image} 
              size="xl" 
              className="relative w-48 h-48 lg:w-56 lg:h-56 rounded-[3rem] border-8 border-white/10 ring-1 ring-white/10 shadow-2xl skew-y-1 hover:skew-y-0 transition-all duration-700 active:scale-95 cursor-pointer"
              onImageUpdate={(url) => updateEmployee(employee.id, { image: url })}
            />
            <div className={cn(
              "absolute -bottom-4 -right-4 w-16 h-16 rounded-[1.5rem] border-4 border-[#05060f] flex items-center justify-center text-white shadow-2xl transition-transform duration-500 hover:scale-110",
              employee.risk > 0.7 ? "bg-rose-500" : "bg-indigo-600"
            )}>
               {employee.risk > 0.7 ? <ShieldAlert className="w-8 h-8" /> : <Zap className="w-8 h-8" />}
            </div>
          </div>

          <div className="flex-1 w-full space-y-8">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <h1 className="text-6xl font-display font-black text-white tracking-tight leading-none uppercase">{employee.name}</h1>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-xs",
                      employee.status === 'Active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      {employee.status}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-y-4 gap-x-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none mb-2">Job Designation</span>
                    <span className="text-xl font-bold text-slate-300 tracking-tight">{employee.role}</span>
                  </div>
                  <div className="w-px h-10 bg-white/5 hidden md:block" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.2em] leading-none mb-2">Department</span>
                    <span className="text-xl font-bold text-indigo-400 tracking-tight">{employee.dept}</span>
                  </div>
                  <div className="w-px h-10 bg-white/5 hidden md:block" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none mb-2">Employee ID</span>
                    <span className="text-xl text-white/20 font-bold tracking-tighter">{8000 + parseInt(employee.id)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-tight">
                    <MapPin className="w-4 h-4 text-indigo-500/40" /> {employee.workLocation}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-tight">
                    <Clock className="w-4 h-4 text-indigo-500/40" /> {employee.employmentType}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-tight">
                    <Mail className="w-4 h-4 text-indigo-500/40" /> {employee.email}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 min-w-[240px]">
                 <button className="group relative w-full px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold uppercase tracking-[0.1em] text-[11px] transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                    View Performance Review
                 </button>
                 <div className="flex gap-4">
                    <button className="flex-1 px-6 py-4 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-full font-bold uppercase tracking-widest text-[10px] transition-all premium-shadow">
                       Export Data
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Neural Snapshot Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-6">
        {[
          { label: 'Performance', value: employee.performanceScore, icon: Target, color: 'text-indigo-400', bg: 'bg-indigo-500/10', suffix: '%' },
          { label: 'Risk Factor', value: Math.round(employee.risk * 100), icon: Activity, color: employee.risk > 0.7 ? 'text-rose-400' : 'text-amber-400', bg: employee.risk > 0.7 ? 'bg-rose-500/10' : 'bg-amber-500/10', suffix: '%' },
          { label: 'Engagement', value: employee.engagementScore, icon: Heart, color: 'text-emerald-400', bg: 'bg-emerald-500/10', suffix: '' },
          { label: 'Market Bench', value: employee.salaryBand, icon: DollarSign, color: 'text-slate-300', bg: 'bg-white/5', isText: true },
          { label: 'Promotion', value: employee.promotionReadiness, icon: UserCheck, color: 'text-purple-400', bg: 'bg-purple-500/10', suffix: '%' },
          { label: 'Consistency', value: employee.attendanceScore, icon: Watch, color: 'text-sky-400', bg: 'bg-sky-500/10', suffix: '%' },
          { label: 'Burnout Signal', value: Math.round(employee.burnoutRisk), icon: Flame, color: employee.burnoutRisk > 60 ? 'text-rose-400' : 'text-slate-500', bg: employee.burnoutRisk > 60 ? 'bg-rose-500/10' : 'bg-white/5', suffix: '%' },
          { label: 'Satisfaction', value: employee.satisfactionLevel, icon: MessageSquare, color: 'text-amber-400', bg: 'bg-amber-500/10', suffix: '%' },
        ].map((stat, i) => (
          <Card key={i} className="p-6 flex flex-col gap-4 group hover:-translate-y-1 transition-all duration-300">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-2">{stat.label}</span>
              {stat.isText ? (
                <span className="text-sm font-bold text-white tracking-tight mt-1">{stat.value}</span>
              ) : (
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-3xl font-display font-bold text-white tracking-tighter leading-none">{stat.value}</span>
                  <span className="text-xs font-bold text-white/30 mb-0.5">{stat.suffix}</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Detailed Intelligence Modules */}
      <div className="pt-4 space-y-10">
        <div className="flex items-center gap-12 border-b border-white/5 px-2 overflow-x-auto no-scrollbar">
           {['overview', 'performance', 'intelligence', 'retention'].map((tab) => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={cn(
                 "pb-5 text-[11px] font-black uppercase tracking-[0.25em] transition-all relative whitespace-nowrap",
                 activeTab === tab ? "text-indigo-400" : "text-white/20 hover:text-white/40"
               )}
             >
               {tab}
               {activeTab === tab && (
                 <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.4)]" />
               )}
             </button>
           ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Neural Cortex Area */}
          <div className="lg:col-span-8 space-y-12">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-10"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="p-8 space-y-8">
                      <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Info className="w-4 h-4 text-blue-400" />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Employee Information</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                        {[
                          { label: 'Joining Date', value: 'June 2021' },
                          { label: 'Education', value: employee.education },
                          { label: 'Work Tenure', value: employee.tenure },
                          { label: 'Years in Role', value: employee.yearsInRole },
                          { label: 'Work Location', value: employee.workLocation },
                          { label: 'Overtime Status', value: employee.overtimeStatus },
                        ].map((item, i) => (
                          <div key={i} className="space-y-2">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.1em] block">{item.label}</span>
                            <span className="text-sm text-slate-300 font-bold tracking-tight">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-8 space-y-8">
                      <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-purple-400" />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Reporting Manager</h3>
                      </div>
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-5 hover:bg-white/10 hover:border-indigo-500/30 hover:premium-shadow-sm transition-all cursor-pointer group">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center premium-shadow group-hover:scale-105 transition-transform duration-500">
                          <ProfileAvatar 
                            employeeId="manager-1"
                            initials="AD"
                            size="md"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Supervisor</span>
                          <span className="text-white font-bold text-base leading-tight">{employee.manager}</span>
                          <span className="text-[10px] text-white/30 font-medium uppercase tracking-tight">{employee.managerRole}</span>
                        </div>
                        <div className="ml-auto w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/20 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center premium-shadow-sm group hover:-translate-y-1 transition-all">
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1">Cluster Size</span>
                          <span className="text-3xl font-display font-bold text-white tracking-tighter">{employee.teamSize}</span>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center premium-shadow-sm group hover:-translate-y-1 transition-all">
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1">Sub-Nodes</span>
                          <span className="text-3xl font-display font-bold text-white tracking-tighter">0</span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Skills Section */}
                    <Card className="p-10 space-y-10 group overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.15] transition-opacity">
                      <Brain className="w-48 h-48 text-indigo-500" />
                    </div>
                    <div className="flex items-center justify-between relative">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-display font-bold text-white tracking-tight uppercase">Skill Matrix</h3>
                        <p className="text-xs font-medium text-slate-500">Verified technological proficiencies and professional capabilities.</p>
                      </div>
                      <button className="flex items-center gap-3 px-6 py-3 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all shadow-xs">
                        <Plus className="w-4 h-4" /> Add Skill
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4 relative">
                      {employee.skills.map((skill, si) => (
                        <motion.div 
                          key={skill}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: si * 0.05 }}
                          className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-xs text-slate-300 font-bold uppercase tracking-tight hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-default flex items-center gap-4 group"
                        >
                          <div className={cn("w-2 h-2 rounded-full", ["bg-blue-400", "bg-purple-400", "bg-emerald-400", "bg-amber-400"][si % 4])} />
                          {skill}
                          <button className="w-6 h-6 rounded-lg bg-white/5 text-white/20 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-400 flex items-center justify-center transition-all">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'performance' && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-10"
                >
                   <Card className="p-10 space-y-10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-display font-bold text-white tracking-tight uppercase">Performance Analytics</h3>
                        <p className="text-xs font-medium text-slate-500">Real-time performance metrics aggregated across historical review periods.</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">+12% Monthly</span>
                        </div>
                        <Badge variant="success" className="px-6 py-2 rounded-full text-[10px] uppercase font-black tracking-widest">Top Performer</Badge>
                      </div>
                    </div>
                    <div className="h-[350px] w-full pt-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={PERFORMANCE_DATA}>
                          <defs>
                            <linearGradient id="performanceGlowLight" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                          />
                          <YAxis domain={[0, 100]} hide />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#0a0b14', 
                              borderRadius: '24px', 
                              border: '1px solid rgba(255,255,255,0.1)', 
                              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                              padding: '16px'
                            }}
                            itemStyle={{ color: '#818cf8', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#6366f1" 
                            strokeWidth={4} 
                            fillOpacity={1} 
                            fill="url(#performanceGlowLight)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {['Technical Depth', 'Mentorship', 'Leadership'].map((m) => (
                         <div key={m} className="p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-4">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{m}</span>
                            <div className="flex items-end gap-2">
                               <span className="text-3xl font-display font-bold text-white tracking-tighter">{(90 + Math.random() * 10).toFixed(1)}</span>
                               <span className="text-xs font-bold text-emerald-400 mb-1">+2.4%</span>
                            </div>
                         </div>
                       ))}
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'retention' && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-10"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {getRetentionActions(employee.risk).map((action, ai) => (
                       <Card key={ai} className="p-8 space-y-6 relative group overflow-hidden border-none">
                         <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
                            <Target className="w-32 h-32 text-indigo-500" />
                         </div>
                         <div className="flex items-start justify-between relative">
                            <div className="space-y-1">
                               <Badge variant={action.impact === 'High' ? 'danger' : 'warning'} className="mb-2 bg-transparent border-white/10">{action.impact} Impact</Badge>
                               <h4 className="text-xl font-display font-bold text-white uppercase tracking-tight">{action.title}</h4>
                            </div>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{action.timeframe}</span>
                         </div>
                         <p className="text-sm text-slate-400 leading-relaxed font-medium relative">{action.description}</p>
                         <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-indigo-600/20 active:scale-95 relative">
                            Initiate Workflow
                         </button>
                       </Card>
                     ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'intelligence' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-10"
                >
                  <Card className="p-10 space-y-12 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[100px] rounded-full -z-10" />
                     
                     <div className="relative space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Brain className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-3xl font-display font-bold text-white tracking-tight uppercase">Explainable AI Core</h3>
                        </div>
                        <p className="text-slate-400 font-medium max-w-2xl text-base">Neural decision weight distribution for attrition risk scoring using SHAPLEY values.</p>
                     </div>

                     <div className="space-y-8 pt-6">
                        {SHAP_FACTORS.map((factor, i) => (
                           <div key={i} className="space-y-4">
                              <div className="flex justify-between items-end">
                                 <div className="space-y-1">
                                   <span className="text-sm font-bold text-slate-200 uppercase tracking-tight">{factor.factor}</span>
                                   <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Signal Attribution</div>
                                 </div>
                                 <span className={cn(
                                   "text-xs font-mono font-bold px-3 py-1 rounded-lg", 
                                   factor.type === 'negative' ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
                                 )}>
                                    {factor.type === 'negative' ? '+' : '-'}{Math.round(factor.value * 100)}% Deviation
                                 </span>
                              </div>
                              <div className="h-3 w-full bg-white/5 rounded-full relative p-0.5 overflow-hidden">
                                 <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/10 z-10" />
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.abs(factor.value) * 100}%` }}
                                    className={cn(
                                      "absolute h-full rounded-full shadow-xs",
                                      factor.type === 'negative' ? "left-1/2 bg-rose-500" : "right-1/2 bg-emerald-500"
                                    )}
                                 />
                              </div>
                           </div>
                        ))}
                     </div>

                     <div className="p-10 bg-indigo-600 rounded-[2.5rem] relative overflow-hidden group shadow-2xl shadow-indigo-600/30">
                        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                           <Zap className="w-48 h-48 text-white" />
                        </div>
                        <div className="relative space-y-6">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                 <Activity className="w-6 h-6 text-white" />
                              </div>
                              <h4 className="text-2xl font-display font-bold text-white uppercase tracking-tight">Prescriptive Insight</h4>
                           </div>
                           <p className="text-white/80 text-lg leading-relaxed font-medium">
                             The node <span className="text-white font-black underline decoration-rose-400 decoration-4 underline-offset-4">{employee.name}</span> is over-indexing on burnout signatures. Recommendation: Immediate redistribution of high-entropy tasks and activation of retention-bonus protocol.
                           </p>
                           <div className="flex gap-4 pt-4">
                              <button className="px-10 py-5 bg-white text-indigo-600 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-xl active:scale-95">Execute Protocol</button>
                              <button className="px-10 py-5 bg-white/10 text-white border border-white/20 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-white/20 transition-all">Archive Signal</button>
                           </div>
                        </div>
                     </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Satellite Intel Sidebars */}
          <div className="lg:col-span-4 space-y-12">
             {/* Data Governance */}
             <Card className="p-8 space-y-8 bg-slate-900 border-none relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,1)]" />
                <div className="flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Global Audit</span>
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-3">
                         <Lock className="w-4 h-4 text-amber-500" />
                         Governance Control
                      </h4>
                   </div>
                   <Badge variant="neutral" className="bg-white/10 text-white/60 border-none text-[9px] px-2 uppercase font-black tracking-widest">Lvl 4 Access</Badge>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center justify-between py-4 border-b border-white/5">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">Privacy Masking</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Encrypted</span>
                      </div>
                   </div>
                   <div className="flex items-center justify-between py-4">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">Identity Sync</span>
                      <span className="text-[10px] text-white font-black uppercase tracking-widest">Aura-Verified</span>
                   </div>
                   <button className="w-full py-5 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-white transition-all bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 hover:bg-white/10">
                      <Eye className="w-4 h-4" /> Full Audit Log
                   </button>
                </div>
             </Card>

             {/* Recent Context Stream */}
             <Card className="p-8 space-y-10">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Temporal Logs</span>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">Context Feed</h4>
                </div>
                <div className="space-y-10 relative">
                   <div className="absolute left-2.5 top-2 bottom-2 w-[2px] bg-slate-50" />
                   {[
                      { icon: AlertTriangle, title: 'Risk Alert Propagation', time: '124m ago', status: 'Critical', color: 'bg-rose-500 ring-rose-500/20' },
                      { icon: Target, title: 'Milestone Assessment', time: '1d ago', status: 'Verified', color: 'bg-indigo-500 ring-indigo-500/20' },
                      { icon: Globe, title: 'Geo-Spatial Sync', time: '3d ago', status: 'Updated', color: 'bg-emerald-500 ring-emerald-500/20' },
                   ].map((event, i) => (
                      <div key={i} className="pl-12 relative group cursor-pointer">
                         <div className={cn("absolute left-0 top-1.5 w-5 h-5 rounded-lg flex items-center justify-center z-10 transition-all group-hover:scale-125 ring-8", event.color)}>
                           <event.icon className="w-2.5 h-2.5 text-white" />
                         </div>
                         <div className="flex justify-between items-start mb-1">
                            <span className="text-xs text-slate-900 font-black uppercase leading-tight group-hover:text-indigo-600 transition-colors">{event.title}</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{event.time}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{event.status}</span>
                         </div>
                      </div>
                   ))}
                </div>
                <button className="w-full flex items-center justify-center gap-3 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 hover:text-indigo-600 transition-colors group">
                   Load Neural History
                   <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
             </Card>

             {/* Dynamic Signal Strength */}
             <Card className="p-10 flex flex-col items-center text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest w-full text-left mb-10">Signal Integrity</h4>
                <div className="relative w-48 h-48 mb-8">
                   <div className="absolute inset-0 rounded-full border-[10px] border-white/5 shadow-inner" />
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                            data={[
                               { value: employee.engagementScore, fill: '#6366f1' },
                               { value: 100 - employee.engagementScore, fill: 'rgba(255,255,255,0.05)' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={0}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                         >
                            <Cell fill="#6366f1" stroke="none" />
                            <Cell fill="rgba(255,255,255,0.05)" stroke="none" />
                         </Pie>
                      </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-5xl font-display font-bold text-white tracking-tighter leading-none mb-2">{employee.engagementScore}</span>
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Index</span>
                   </div>
                </div>
                <div className="space-y-6 w-full">
                  <div className="flex items-center justify-center gap-3">
                     <div className="h-2 w-2 rounded-full bg-emerald-400" />
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Active Connection: Stable</span>
                  </div>
                  <div className="flex gap-3 justify-center">
                     {['Pulse', 'Flow', 'Link'].map((btn, i) => (
                       <button key={i} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-white/30 uppercase tracking-widest hover:bg-white/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all premium-shadow-sm">
                          {btn}
                       </button>
                     ))}
                  </div>
                </div>
             </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
