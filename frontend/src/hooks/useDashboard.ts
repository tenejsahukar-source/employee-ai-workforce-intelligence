/**
 * src/hooks/useDashboard.ts
 *
 * React Query hooks wrapping every analytics API call used by DashboardPage.
 * Each hook has: loading state, error state, stale-while-revalidate, and
 * a consistent refetch interval for near-real-time data.
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchOverview,
  fetchRiskDistribution,
  fetchDepartments,
  fetchHighRiskEmployees,
  fetchTrends,
} from '../services/analyticsApi';

const STALE_MS   = 60_000;   // data considered fresh for 1 min
const REFETCH_MS = 120_000;  // background refetch every 2 min

/** Overview KPIs: attrition risk, high-risk count, retention score, confidence */
export function useOverview() {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: fetchOverview,
    staleTime: STALE_MS,
    refetchInterval: REFETCH_MS,
  });
}

/** Donut chart data: Low / Medium / High risk buckets */
export function useRiskDistribution() {
  return useQuery({
    queryKey: ['analytics', 'riskDistribution'],
    queryFn: fetchRiskDistribution,
    staleTime: STALE_MS,
    refetchInterval: REFETCH_MS,
  });
}

/** Horizontal bar chart: per-department average risk score */
export function useDepartments() {
  return useQuery({
    queryKey: ['analytics', 'departments'],
    queryFn: fetchDepartments,
    staleTime: STALE_MS,
    refetchInterval: REFETCH_MS,
  });
}

/** Priority queue table: top-N employees by risk score */
export function useHighRiskEmployees(limit = 5) {
  return useQuery({
    queryKey: ['analytics', 'highRisk', limit],
    queryFn: () => fetchHighRiskEmployees(limit),
    staleTime: STALE_MS,
    refetchInterval: REFETCH_MS,
  });
}

/** Area chart: historical attrition rate + AI projection */
export function useTrends() {
  return useQuery({
    queryKey: ['analytics', 'trends'],
    queryFn: fetchTrends,
    staleTime: STALE_MS,
    refetchInterval: REFETCH_MS,
  });
}
