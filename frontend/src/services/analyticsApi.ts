/**
 * src/services/analyticsApi.ts
 *
 * Typed API service for all AetherIQ analytics endpoints.
 * Every function maps 1:1 to a FastAPI route in analytics.py.
 * Wraps the shared apiClient (JWT interceptor already attached).
 */

import apiClient from './predictionApi';

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE TYPES — mirror FastAPI Pydantic schemas exactly
// ─────────────────────────────────────────────────────────────────────────────

export interface OverviewResponse {
  total_employees: number;
  avg_attrition_risk: number;        // 0.0 – 1.0
  high_risk_count: number;
  retention_score: number;           // 0 – 100
  ai_confidence: number;             // 0.0 – 1.0
  avg_risk_delta: number;            // vs previous period, signed float
  high_risk_delta: number;           // signed int vs previous period
  retention_delta: number;           // signed float
}

export interface RiskBucket {
  name: 'Low Risk' | 'Medium Risk' | 'High Risk';
  value: number;
  fill: string;
}

export interface RiskDistributionResponse {
  buckets: RiskBucket[];
  total: number;
}

export interface DepartmentRisk {
  name: string;
  count: number;
  risk: number;     // 0 – 100 integer
  avg_tenure: number;
}

export interface DepartmentsResponse {
  departments: DepartmentRisk[];
}

export interface HighRiskEmployee {
  id: string;
  name: string;
  dept: string;
  role: string;
  risk: number;           // 0.0 – 1.0
  email: string;
  image?: string;
}

export interface HighRiskEmployeesResponse {
  employees: HighRiskEmployee[];
  total: number;
}

export interface TrendPoint {
  month: string;
  rate: number | null;
  predicted: number;
}

export interface TrendsResponse {
  points: TrendPoint[];
  period_label: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/v1/analytics/overview */
export async function fetchOverview(): Promise<OverviewResponse> {
  console.group('📊 [analyticsApi] fetchOverview');
  console.log('GET /api/v1/analytics/overview');
  console.groupEnd();

  const res = await apiClient.get<OverviewResponse>('/api/v1/analytics/overview');
  console.log('✅ [analyticsApi] overview:', res.data);
  return res.data;
}

/** GET /api/v1/analytics/risk-distribution */
export async function fetchRiskDistribution(): Promise<RiskDistributionResponse> {
  console.group('🍩 [analyticsApi] fetchRiskDistribution');
  console.log('GET /api/v1/analytics/risk-distribution');
  console.groupEnd();

  const res = await apiClient.get<RiskDistributionResponse>('/api/v1/analytics/risk-distribution');
  console.log('✅ [analyticsApi] riskDistribution:', res.data);
  return res.data;
}

/** GET /api/v1/analytics/departments */
export async function fetchDepartments(): Promise<DepartmentsResponse> {
  console.group('🏢 [analyticsApi] fetchDepartments');
  console.log('GET /api/v1/analytics/departments');
  console.groupEnd();

  const res = await apiClient.get<DepartmentsResponse>('/api/v1/analytics/departments');
  console.log('✅ [analyticsApi] departments:', res.data);
  return res.data;
}

/** GET /api/v1/analytics/high-risk-employees?limit=5 */
export async function fetchHighRiskEmployees(
  limit = 5
): Promise<HighRiskEmployeesResponse> {
  console.group('🚨 [analyticsApi] fetchHighRiskEmployees');
  console.log(`GET /api/v1/analytics/high-risk-employees?limit=${limit}`);
  console.groupEnd();

  const res = await apiClient.get<HighRiskEmployeesResponse>(
    '/api/v1/analytics/high-risk-employees',
    { params: { limit } }
  );
  console.log('✅ [analyticsApi] highRisk:', res.data);
  return res.data;
}

/** GET /api/v1/analytics/trends */
export async function fetchTrends(): Promise<TrendsResponse> {
  console.group('📈 [analyticsApi] fetchTrends');
  console.log('GET /api/v1/analytics/trends');
  console.groupEnd();

  const res = await apiClient.get<TrendsResponse>('/api/v1/analytics/trends');
  console.log('✅ [analyticsApi] trends:', res.data);
  return res.data;
}
