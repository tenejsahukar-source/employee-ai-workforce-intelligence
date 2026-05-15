import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Badge } from '@/components/ui/Layout';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

import { ProfileAvatar } from '@/components/ui/ProfileAvatar';

import { useEmployees, Employee } from '@/context/EmployeeContext';
import Papa from 'papaparse';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Mail, 
  Phone, 
  Briefcase,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Upload,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  LayoutGrid,
  List
} from 'lucide-react';

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Product', 'IT'];

export function EmployeeRecordsPage() {
  const { employees, setEmployees, updateEmployee } = useEmployees();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: 'name' | 'dept' | 'risk' | 'tenure';
    direction: 'asc' | 'desc';
  }>({ key: 'name', direction: 'asc' });

  const handleSort = (key: 'name' | 'dept' | 'risk' | 'tenure') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const parseTenure = (tenure: string) => {
    const val = parseFloat(tenure);
    if (isNaN(val)) return 0;
    if (tenure.toLowerCase().includes('mos')) return val / 12;
    return val;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const parsedData = results.data as any[];
        
        // Map CSV data to Employee structure
        const newEmployees: Employee[] = parsedData.map(row => ({
          id: String(row.id || Math.random().toString(36).substr(2, 9)),
          name: String(row.name || 'Unknown'),
          role: String(row.role || 'N/A'),
          dept: String(row.dept || 'Engineering'),
          tenure: String(row.tenure || '0 yrs'),
          risk: parseFloat(row.risk) || 0,
          image: String(row.image || row.name?.split(' ').map((n: string) => n[0]).join('') || '?'),
          email: String(row.email || ''),
          manager: String(row.manager || 'N/A'),
          managerRole: String(row.managerRole || 'N/A'),
          skills: typeof row.skills === 'string' ? row.skills.split(',').map((s: string) => s.trim()) : [],
          certifications: typeof row.certifications === 'string' ? row.certifications.split(',').map((s: string) => s.trim()) : [],
          // Expanded AetherIQ Attributes
          workLocation: row.workLocation || 'San Francisco, HQ',
          employmentType: row.employmentType || 'Full-time',
          status: row.status || (parseFloat(row.risk) > 0.7 ? 'High Risk' : 'Active'),
          performanceScore: parseInt(row.performanceScore) || 85,
          satisfactionLevel: parseInt(row.satisfactionLevel) || 75,
          salaryBand: row.salaryBand || '$140k - $165k',
          promotionReadiness: parseInt(row.promotionReadiness) || 50,
          attendanceScore: parseInt(row.attendanceScore) || 95,
          burnoutRisk: parseInt(row.burnoutRisk) || 30,
          engagementScore: parseInt(row.engagementScore) || 80,
          age: parseInt(row.age) || 30,
          gender: row.gender || 'Not Specified',
          education: row.education || "Bachelor's Degree",
          maritalStatus: row.maritalStatus || 'Single',
          yearsInRole: row.yearsInRole || '2 yrs',
          teamSize: parseInt(row.teamSize) || 10,
          travelFrequency: row.travelFrequency || 'Rarely',
          overtimeStatus: row.overtimeStatus || 'Occasional',
        }));

        if (newEmployees.length > 0) {
          setEmployees(newEmployees);
        }
        setIsUploading(false);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setIsUploading(false);
      }
    });
  };

  useEffect(() => {
    const deptParam = searchParams.get('dept');
    if (deptParam && DEPARTMENTS.includes(deptParam)) {
      setSelectedDepts([deptParam]);
    }
  }, [searchParams]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDepts([]);
    setSearchParams({});
  };

  const toggleDept = (dept: string) => {
    setSelectedDepts(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDepts.length === 0 || selectedDepts.includes(emp.dept);
    return matchesSearch && matchesDept;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    let aValue: any = a[sortConfig.key];
    let bValue: any = b[sortConfig.key];

    if (sortConfig.key === 'tenure') {
      aValue = parseTenure(a.tenure);
      bValue = parseTenure(b.tenure);
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const hasActiveFilters = searchQuery !== '' || selectedDepts.length > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className="relative space-y-12 pb-24 min-h-screen"
    >
      {/* Decorative Atmosphere */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-black text-white tracking-tight leading-tight uppercase">Employee Directory</h1>
          <p className="text-slate-400 font-medium max-w-xl">Centralized workforce management for auditing and internal HR coordination.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-full text-[11px] font-bold uppercase tracking-widest border border-white/10 premium-shadow transition-all cursor-pointer group">
             <Upload className={cn("w-4 h-4 text-slate-500 group-hover:text-white", isUploading && "animate-bounce")} />
             {isUploading ? 'Uploading...' : 'Upload CSV'}
             <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={() => navigate('/predict')}
            className="flex items-center gap-3 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-[11px] font-bold uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95"
          >
             <UserPlus className="w-4 h-4" />
             Add Employee
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Filter Sidebar (Mini) */}
        <div className="lg:w-80 shrink-0 space-y-8">
          <Card className="p-8 space-y-10 sticky top-24">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Active Search</p>
                  {hasActiveFilters && (
                    <button 
                      onClick={clearFilters}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-widest transition-colors font-mono"
                    >
                      [Reset]
                    </button>
                  )}
                </div>
                <div className="relative group">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                      <Search className="w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                   </div>
                    <input 
                      type="text" 
                      placeholder="Search name, role or ID..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-full pl-12 pr-4 py-4 text-xs text-white font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-hidden transition-all placeholder:text-white/20" 
                    />
                 </div>
             </div>
 
             <div className="space-y-6">
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Work Stream Filter</p>
                 <div className="space-y-3">
                   {DEPARTMENTS.map(dept => (
                     <label key={dept} className="flex items-center gap-4 cursor-pointer group">
                       <input 
                         type="checkbox"
                         checked={selectedDepts.includes(dept)}
                         onChange={() => toggleDept(dept)}
                         className="hidden"
                       />
                       <div className={cn(
                         "w-5 h-5 rounded-lg border-2 transition-all duration-300 flex items-center justify-center",
                         selectedDepts.includes(dept) 
                           ? "bg-blue-600 border-blue-600 shadow-md shadow-blue-600/20" 
                           : "bg-white/5 border-white/10 group-hover:border-blue-500/50 group-hover:bg-blue-500/5"
                       )}>
                         {selectedDepts.includes(dept) && <div className="w-2 h-2 bg-white rounded-full" />}
                       </div>
                       <span className={cn(
                         "text-xs uppercase tracking-tight transition-colors font-bold",
                         selectedDepts.includes(dept) ? "text-white" : "text-slate-400 group-hover:text-slate-200 font-medium"
                       )}>
                         {dept}
                       </span>
                     </label>
                   ))}
                 </div>
             </div>
 
             <div className="space-y-4 pt-4 border-t border-white/5">
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Risk Signal Threshold</p>
                 <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                       <Badge variant="danger" className="border-none shadow-none bg-transparent text-rose-400">Critical Risk</Badge>
                       <span className="text-[10px] font-mono font-bold text-rose-400">&gt; 75%</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                       <Badge variant="warning" className="border-none shadow-none bg-transparent text-amber-400">Needs Review</Badge>
                       <span className="text-[10px] font-mono font-bold text-amber-400">40-75%</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                       <Badge variant="success" className="border-none shadow-none bg-transparent text-emerald-400">Stable</Badge>
                       <span className="text-[10px] font-mono font-bold text-emerald-400">&lt; 40%</span>
                    </div>
                 </div>
             </div>
          </Card>
        </div>

        {/* Records Grid */}
        <div className="flex-1 space-y-10 group/grid">
           {/* Sort Toolbar */}
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 border-b border-white/5">
              <div className="flex items-center gap-4">
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Sort Intelligence By</p>
                 <div className="flex items-center gap-1">
                    {[
                      { key: 'name', label: 'Name' },
                      { key: 'dept', label: 'Dept' },
                      { key: 'risk', label: 'Risk' },
                      { key: 'tenure', label: 'Tenure' }
                    ].map((sort) => (
                      <button
                        key={sort.key}
                        onClick={() => handleSort(sort.key as any)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all flex items-center gap-2",
                          sortConfig.key === sort.key 
                            ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" 
                            : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent"
                        )}
                      >
                        {sort.label}
                        {sortConfig.key === sort.key && (
                          sortConfig.direction === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                        )}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="flex items-center gap-6">
                 <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex">
                    <button className="p-2 text-white bg-indigo-600 rounded-lg shadow-lg">
                       <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-500 hover:text-slate-300">
                       <List className="w-4 h-4" />
                    </button>
                 </div>
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">{sortedEmployees.length} Nodes Indexed</p>
              </div>
           </div>

           {sortedEmployees.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
                {sortedEmployees.map((emp, i) => (
                  <motion.div
                    key={emp.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card 
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      className="p-8 group relative overflow-hidden flex flex-col h-full"
                    >
                      {/* Sub-atmospheric glow */}
                      <div className={cn(
                        "absolute -top-12 -right-12 w-24 h-24 blur-[40px] rounded-full opacity-0 group-hover:opacity-20 transition-opacity",
                        emp.risk > 0.7 ? "bg-rose-500" : emp.risk > 0.4 ? "bg-amber-500" : "bg-emerald-500"
                      )} />

                      <div className="flex items-start justify-between mb-8">
                         <div className="relative">
                            <ProfileAvatar 
                              employeeId={emp.id} 
                              initials={emp.image} 
                              size="lg"
                              className="border-2 border-white shadow-lg ring-1 ring-slate-100"
                              onImageUpdate={(url) => updateEmployee(emp.id, { image: url })}
                            />
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-6 h-6 rounded-lg border-2 border-white flex items-center justify-center shadow-lg",
                              emp.risk > 0.7 ? "bg-rose-500" : emp.risk > 0.4 ? "bg-amber-500" : "bg-emerald-500"
                            )}>
                               {emp.risk > 0.7 ? <AlertTriangle className="w-3 h-3 text-white" /> : <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                         </div>
                         <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">ID:{8000 + parseInt(emp.id)}</span>
                            <button className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-200 border border-transparent rounded-xl transition-all">
                               <MoreVertical className="w-5 h-5" />
                            </button>
                         </div>
                      </div>

                      <div className="space-y-4 flex-1">
                         <div className="space-y-1">
                            <h3 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/employees/${emp.id}`);
                              }}
                              className="text-xl font-display font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight uppercase leading-none cursor-pointer hover:underline decoration-blue-500/30 decoration-2 underline-offset-4"
                            >
                              {emp.name}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{emp.role}</p>
                         </div>
                         
                         <div className="flex items-center gap-4 py-2">
                             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100/50 rounded-full">
                                <Briefcase className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{emp.role}</span>
                             </div>
                             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100/50 rounded-full">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{emp.tenure} tenure</span>
                             </div>
                         </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                         <div className="space-y-3 flex-1 px-1">
                             <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest mb-1.5">
                               <span className="text-slate-400">Risk Factor</span>
                               <span className={cn(
                                 emp.risk > 0.7 ? "text-rose-600" : emp.risk > 0.4 ? "text-amber-600" : "text-blue-600"
                               )}>{(emp.risk * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden p-[1px]">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${emp.risk * 100}%` }}
                                 className={cn(
                                   "h-full rounded-full shadow-sm",
                                   emp.risk > 0.7 ? "bg-rose-500 shadow-rose-500/20" : emp.risk > 0.4 ? "bg-amber-500 shadow-amber-500/20" : "bg-blue-500 shadow-blue-500/20"
                                 )}
                               />
                            </div>
                         </div>
                      </div>
                      
                      {/* Hover Overlay Button */}
                      <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none">
                          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
                             <ChevronRight className="w-5 h-5" />
                          </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center py-32 px-12 text-center glass border border-dashed border-slate-200 rounded-[2rem] shadow-sm">
                <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                   <Users className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">Zero Matching Nodes</h3>
                <p className="text-sm text-slate-500 max-w-sm mb-10 font-medium">The intelligence search query returned no matching employee protocols current active within the network.</p>
                <button 
                  onClick={clearFilters}
                  className="px-10 py-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all"
                >
                  Clear Global Filters
                </button>
             </div>
           )}

           {/* Pagination (Summary) */}
           <div className="flex items-center justify-center py-12">
              <button className="group flex items-center gap-3 px-10 py-4 bg-white/5 border border-white/10 premium-shadow rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all">
                 Fetch More Intelligence Clusters
                 <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-indigo-400 transition-colors" />
              </button>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
