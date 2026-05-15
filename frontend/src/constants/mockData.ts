/**
 * Mock data for Enterprise AI Workforce Intelligence
 */

export const KPI_DATA = [
  { label: 'Overall Attrition Risk', value: '14.2%', trend: '+1.4%', status: 'warning' },
  { label: 'High-Risk Employees', value: '128', trend: '-12', status: 'danger' },
  { label: 'Retention Score', value: '86/100', trend: '+2.1%', status: 'success' },
  { label: 'AI Confidence', value: '94.8%', trend: 'Stable', status: 'neutral' },
];

export const ATTRITION_TREND_DATA = [
  { month: 'Jan', rate: 12.1, predicted: 12.5 },
  { month: 'Feb', rate: 11.8, predicted: 12.0 },
  { month: 'Mar', rate: 13.5, predicted: 13.2 },
  { month: 'Apr', rate: 12.9, predicted: 13.0 },
  { month: 'May', rate: 14.2, predicted: 14.5 },
  { month: 'Jun', rate: null, predicted: 15.1 },
];

export const DEPARTMENT_DATA = [
  { name: 'Engineering', count: 450, risk: 18 },
  { name: 'Sales', count: 320, risk: 24 },
  { name: 'Marketing', count: 180, risk: 12 },
  { name: 'HR', count: 85, risk: 8 },
  { name: 'Product', count: 210, risk: 15 },
];

export const RISK_DISTRIBUTION = [
  { name: 'Low Risk', value: 70, fill: '#10b981' },
  { name: 'Medium Risk', value: 20, fill: '#f59e0b' },
  { name: 'High Risk', value: 10, fill: '#ef4444' },
];

export const RECENT_PREDICTIONS = [
  { id: '101', employee: 'John Cooper', department: 'Engineering', score: 0.88, status: 'High Risk', date: '2024-05-12' },
  { id: '102', employee: 'Elena Vance', department: 'Product', score: 0.42, status: 'Medium Risk', date: '2024-05-11' },
  { id: '103', employee: 'Marcus Holloway', department: 'Sales', score: 0.15, status: 'Low Risk', date: '2024-05-10' },
  { id: '104', employee: 'Faith Connors', department: 'Marketing', score: 0.72, status: 'High Risk', date: '2024-05-09' },
  { id: '105', employee: 'Gordon Freeman', department: 'Engineering', score: 0.05, status: 'Low Risk', date: '2024-05-08' },
];

export const EMPLOYEES = [
  { id: '1', name: 'Sarah Executive', role: 'V.P. Talent Intelligence', dept: 'Executive', tenure: '6.5 yrs', risk: 0.12, image: 'SE', email: 'sarah@aetheriq.ai', manager: 'Chief People Officer', managerRole: 'CPO', skills: ['Talent Strategy', 'Workforce Planning', 'Predictive Analytics', 'Leadership'], certifications: ['SHRM-SCP', 'Global HR Certification'] },
  { id: '101', name: 'John Cooper', role: 'Staff Engineer', dept: 'Engineering', tenure: '4.2 yrs', risk: 0.88, image: 'JC', email: 'j.cooper@enterprise.ai', manager: 'Sarah Chen', managerRole: 'V.P. Engineering', skills: ['System Architecture', 'Distributed Systems', 'Kubernetes', 'Go'], certifications: ['AWS Solutions Architect', 'Google Cloud Professional'] },
  { id: '102', name: 'Elena Vance', role: 'Product Manager', dept: 'Product', tenure: '2.1 yrs', risk: 0.42, image: 'EV', email: 'e.vance@enterprise.ai', manager: 'Robert Vance', managerRole: 'Chief Product Officer', skills: ['Product Roadmap', 'Agile Methodology', 'User Research', 'A/B Testing'], certifications: ['PMP', 'Certified Scrum Product Owner'] },
  { id: '103', name: 'Marcus Holloway', role: 'Sales Lead', dept: 'Sales', tenure: '1.5 yrs', risk: 0.15, image: 'MH', email: 'm.holloway@enterprise.ai', manager: 'DedSec Lead', managerRole: 'SVP Global Sales', skills: ['Enterprise Sales', 'Negotiation', 'CRM Strategy', 'Market Analysis'], certifications: ['Salesforce Certified Administrator'] },
  { id: '104', name: 'Faith Connors', role: 'Marketing Director', dept: 'Marketing', tenure: '3.8 yrs', risk: 0.72, image: 'FC', email: 'f.connors@enterprise.ai', manager: 'Gabriel Miller', managerRole: 'Chief Marketing Officer', skills: ['Brand Strategy', 'Growth Hacking', 'Direct Response', 'PR'], certifications: ['Google Ads Search', 'HubSpot Inbound Marketing'] },
  { id: '105', name: 'Gordon Freeman', role: 'Principal Researcher', dept: 'Engineering', tenure: '8.4 yrs', risk: 0.05, image: 'GF', email: 'g.freeman@enterprise.ai', manager: 'Sarah Chen', managerRole: 'V.P. Engineering', skills: ['Quantum Physics', 'Experimental Design', 'C++', 'Data Engineering'], certifications: ['PhD Physics', 'Senior Research Fellow'] },
  { id: '106', name: 'Alyx Vance', role: 'UX Designer', dept: 'Product', tenure: '0.8 yrs', risk: 0.55, image: 'AV', email: 'a.vance@enterprise.ai', manager: 'Elena Vance', managerRole: 'Product Manager', skills: ['UI/UX Design', 'Figma', 'Prototyping', 'Visual Arts'], certifications: ['Google UX Design Professional'] },
  { id: '107', name: 'Barney Calhoun', role: 'Security Ops', dept: 'IT', tenure: '5.2 yrs', risk: 0.22, image: 'BC', email: 'b.calhoun@enterprise.ai', manager: 'David Steele', managerRole: 'VP Operations', skills: ['Network Security', 'Incident Response', 'Firewall Management', 'Linux'], certifications: ['CISSP', 'CompTIA Security+'] },
  { id: '108', name: 'Isaac Kleiner', role: 'Data Scientist', dept: 'Engineering', tenure: '10.1 yrs', risk: 0.08, image: 'IK', email: 'i.kleiner@enterprise.ai', manager: 'Sarah Chen', managerRole: 'V.P. Engineering', skills: ['Machine Learning', 'Python', 'Statistical Modeling', 'PyTorch'], certifications: ['AWS Certified Machine Learning', 'NVIDIA Deep Learning Institute'] },
];

export const SHAP_EXPLANATION = [
  { feature: 'Overtime Hours', contribution: 0.28, type: 'positive' },
  { feature: 'Years at Company', contribution: -0.15, type: 'negative' },
  { feature: 'Stock Options', contribution: -0.22, type: 'negative' },
  { feature: 'Distance from Home', contribution: 0.12, type: 'positive' },
  { feature: 'Job Satisfaction', contribution: -0.18, type: 'negative' },
  { feature: 'Last Promotion', contribution: 0.08, type: 'positive' },
];
