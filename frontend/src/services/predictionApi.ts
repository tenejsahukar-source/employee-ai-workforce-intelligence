/**
 * src/services/predictionApi.ts
 *
 * Centralised API service layer for all prediction-related HTTP calls.
 * Wraps axios with typed request/response interfaces, console debugging,
 * and consistent error normalisation.
 */

import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Axios instance — baseURL reads from Vite env var; falls back to localhost
// In production set VITE_API_BASE_URL=https://your-api-domain.com
// ─────────────────────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT auth token from localStorage on every request
apiClient.interceptors.request.use((config) => {
  // FIXED: Now looking for 'access_token' to match your login process
  const token = localStorage.getItem('access_token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔑 [Interceptor] Attached token:', token.substring(0, 15) + '...');
  } else {
    console.warn('⚠️ [Interceptor] No access_token found in localStorage');
  }
  
  return config;
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS — mirror FastAPI Pydantic schemas exactly
// ─────────────────────────────────────────────────────────────────────────────

export type OvertimeStatus = 'Yes' | 'No';

export type Department =
  | 'sales'
  | 'engineering'
  | 'hr'
  | 'finance'
  | 'operations';

/** Maps 1:1 to FastAPI PredictionRequest */
export interface PredictionRequest {
  employee_id: number;
  age: number;
  daily_rate: number;
  monthly_income: number;
  percent_salary_hike: number;
  distance_from_home: number;
  years_at_company: number;
  job_satisfaction: number;       // 1–4
  work_life_balance: number;      // 1–4
  over_time: OvertimeStatus;
  department: Department;
  job_level: number;              // 1–5
  environment_satisfaction: number; // 1–4
  job_involvement: number;        // 1–4
  performance_rating: number;     // 1–4
  relationship_satisfaction: number; // 1–4
}

/** Maps 1:1 to FastAPI PredictionResponse */
export interface PredictionResponse {
  prediction_id: string;
  prediction: 0 | 1;             // 0 = Retained, 1 = Attrition
  confidence: number;            // 0.0 – 1.0
  model_name: string;
  shap_values: Record<string, number> | null;
  timestamp: string;             // ISO-8601 UTC
}

/** Maps 1:1 to FastAPI PredictionHistoryItem */
export interface PredictionHistoryItem {
  prediction_id: string;
  employee_id: number;
  prediction: 0 | 1;
  confidence: number;
  model_name: string;
  inference_time_ms: number | null;
  timestamp: string;
}

/** Maps 1:1 to FastAPI PredictionHistoryResponse */
export interface PredictionHistoryResponse {
  total: number;
  page: number;
  page_size: number;
  predictions: PredictionHistoryItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/predict/attrition
 *
 * Submits employee feature data to the ML model and returns a prediction.
 * Logs payload and response to console for debugging.
 */
export async function predictAttrition(
  payload: PredictionRequest
): Promise<PredictionResponse> {
  console.group('🚀 [predictAttrition] Outgoing Payload');
  console.log('Endpoint :', '/api/v1/predict/attrition');
  console.log('Payload  :', JSON.stringify(payload, null, 2));
  console.groupEnd();

  try {
    // We no longer need to manually pass headers here because the interceptor handles it
    const response = await apiClient.post<PredictionResponse>(
      '/api/v1/predict/attrition',
      payload
    );

    console.group('✅ [predictAttrition] API Response');
    console.log('Status       :', response.status);
    console.log('Trace ID     :', response.headers['x-trace-id']);
    console.log('Inference ms :', response.headers['x-inference-time-ms']);
    console.log('Model Version:', response.headers['x-model-version']);
    console.log('Body         :', JSON.stringify(response.data, null, 2));
    console.groupEnd();

    return response.data;
  } catch (error) {
    console.group('❌ [predictAttrition] Request Failed');
    if (axios.isAxiosError(error)) {
      console.error('Status :', error.response?.status);
      console.error('Detail :', error.response?.data?.detail ?? error.message);
    } else {
      console.error('Unknown error:', error);
    }
    console.groupEnd();
    throw error;
  }
}

/**
 * GET /api/v1/predictions
 *
 * Fetches paginated prediction history from PostgreSQL.
 * Logs the response to console for debugging.
 */
export async function fetchPredictionHistory(params?: {
  employee_id?: number;
  page?: number;
  page_size?: number;
}): Promise<PredictionHistoryResponse> {
  console.group('📋 [fetchPredictionHistory] Fetching History');
  console.log('Params:', params ?? 'none');
  console.groupEnd();

  try {
    const response = await apiClient.get<PredictionHistoryResponse>(
      '/api/v1/predictions',
      { params }
    );

    console.group('✅ [fetchPredictionHistory] History Response');
    console.log('Total Records:', response.data.total);
    console.log('Page         :', response.data.page, '/', Math.ceil(response.data.total / response.data.page_size));
    console.log('Returned     :', response.data.predictions.length, 'records');
    console.log('First Record :', JSON.stringify(response.data.predictions[0] ?? null, null, 2));
    console.groupEnd();

    return response.data;
  } catch (error) {
    console.group('❌ [fetchPredictionHistory] Request Failed');
    if (axios.isAxiosError(error)) {
      console.error('Status :', error.response?.status);
      console.error('Detail :', error.response?.data?.detail ?? error.message);
    } else {
      console.error('Unknown error:', error);
    }
    console.groupEnd();
    throw error;
  }
}

export default apiClient;