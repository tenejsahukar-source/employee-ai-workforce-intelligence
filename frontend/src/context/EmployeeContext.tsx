import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { EMPLOYEES as INITIAL_EMPLOYEES } from '@/constants/mockData';

export interface Employee {
  id: string;
  name: string;
  role: string;
  dept: string;
  tenure: string;
  risk: number;
  image: string;
  email: string;
  manager: string;
  managerRole: string;
  skills: string[];
  certifications: string[];
  // New AetherIQ attributes
  workLocation?: string;
  employmentType?: string;
  status?: 'Active' | 'On Leave' | 'High Risk';
  performanceScore?: number; // 0-100
  satisfactionLevel?: number; // 0-100
  salaryBand?: string;
  promotionReadiness?: number; // 0-100
  attendanceScore?: number; // 0-100
  burnoutRisk?: number; // 0-100
  engagementScore?: number; // 0-100
  age?: number;
  gender?: string;
  education?: string;
  maritalStatus?: string;
  yearsInRole?: string;
  teamSize?: number;
  travelFrequency?: string;
  overtimeStatus?: string;
}

interface EmployeeContextType {
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  kpis: any[];
  attritionTrend: any[];
  departmentData: any[];
  riskDistribution: any[];
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeProvider = ({ children }: { children: ReactNode }) => {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, ...updates } : emp));
  };

  const kpis = useMemo(() => {
    const highRiskCount = employees.filter(e => e.risk > 0.7).length;
    const avgRisk = employees.length > 0 ? (employees.reduce((acc, curr) => acc + curr.risk, 0) / employees.length) : 0;
    
    return [
      { label: 'Overall Attrition Risk', value: `${(avgRisk * 100).toFixed(1)}%`, trend: '+1.4%', status: avgRisk > 0.3 ? 'warning' : 'success' },
      { label: 'High-Risk Employees', value: highRiskCount.toString(), trend: '-12', status: highRiskCount > 0 ? 'danger' : 'success' },
      { label: 'Retention Score', value: `${(100 - avgRisk * 100).toFixed(0)}/100`, trend: '+2.1%', status: 'success' },
      { label: 'AI Confidence', value: '94.8%', trend: 'Stable', status: 'neutral' },
    ];
  }, [employees]);

  const departmentData = useMemo(() => {
    const deptsMap: Record<string, { count: number; riskSum: number }> = {};
    employees.forEach(emp => {
      if (!deptsMap[emp.dept]) {
        deptsMap[emp.dept] = { count: 0, riskSum: 0 };
      }
      deptsMap[emp.dept].count++;
      deptsMap[emp.dept].riskSum += emp.risk;
    });

    return Object.entries(deptsMap).map(([name, data]) => ({
      name,
      count: data.count,
      risk: Math.round((data.riskSum / data.count) * 100)
    }));
  }, [employees]);

  const riskDistribution = useMemo(() => {
    const distribution = [
      { name: 'Low Risk', value: 0, fill: '#10b981' },
      { name: 'Medium Risk', value: 0, fill: '#f59e0b' },
      { name: 'High Risk', value: 0, fill: '#ef4444' },
    ];

    employees.forEach(emp => {
      if (emp.risk > 0.7) distribution[2].value++;
      else if (emp.risk > 0.3) distribution[1].value++;
      else distribution[0].value++;
    });

    return distribution;
  }, [employees]);

  // For trend, we'll keep it static for now as it's time-series, or mock it based on current risk
  const attritionTrend = useMemo(() => [
    { month: 'Jan', rate: 12.1, predicted: 12.5 },
    { month: 'Feb', rate: 11.8, predicted: 12.0 },
    { month: 'Mar', rate: 13.5, predicted: 13.2 },
    { month: 'Apr', rate: 12.9, predicted: 13.0 },
    { month: 'May', rate: 14.2, predicted: 14.5 },
    { month: 'Jun', rate: null, predicted: Math.round((employees.reduce((acc, curr) => acc + curr.risk, 0) / employees.length) * 100) },
  ], [employees]);

  return (
    <EmployeeContext.Provider value={{ employees, setEmployees, updateEmployee, kpis, attritionTrend, departmentData, riskDistribution }}>
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployees = () => {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error('useEmployees must be used within an EmployeeProvider');
  }
  return context;
};
