/**
 * src/services/employeeService.ts
 *
 * Typed API service for employee CRUD, listing, and bulk CSV/XLSX upload.
 * All routes match the FastAPI employee_upload.py router exactly.
 */

import apiClient from './predictionApi';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface EmployeeListItem {
  id: string;
  name: string;
  role: string;
  dept: string;
  tenure: string;
  risk: number;
  email: string;
  manager: string;
  managerRole: string;
  skills: string[];
  certifications: string[];
  workLocation?: string;
  employmentType?: string;
  status?: 'Active' | 'On Leave' | 'High Risk';
  performanceScore?: number;
  satisfactionLevel?: number;
  salaryBand?: string;
  promotionReadiness?: number;
  attendanceScore?: number;
  burnoutRisk?: number;
  engagementScore?: number;
  age?: number;
  gender?: string;
  education?: string;
  maritalStatus?: string;
  yearsInRole?: string;
  teamSize?: number;
  travelFrequency?: string;
  overtimeStatus?: string;
  image?: string;
}

export interface EmployeeListResponse {
  employees: EmployeeListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface UploadValidationError {
  row: number;
  field: string;
  message: string;
}

export interface BulkUploadResponse {
  inserted: number;
  updated: number;
  skipped: number;
  errors: UploadValidationError[];
  job_id: string;
}

export interface UploadProgressResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  progress: number;       // 0 – 100
  inserted: number;
  total_rows: number;
  errors: UploadValidationError[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/employees
 * Paginated employee list from PostgreSQL.
 */
export async function getEmployees(params?: {
  page?: number;
  page_size?: number;
  dept?: string;
  search?: string;
}): Promise<EmployeeListResponse> {
  console.group('👥 [employeeService] getEmployees');
  console.log('Params:', params ?? 'default');
  console.groupEnd();

  const res = await apiClient.get<EmployeeListResponse>('/api/v1/employees', {
    params,
  });

  console.log(`✅ [employeeService] Loaded ${res.data.employees.length} / ${res.data.total} employees`);
  return res.data;
}

/**
 * GET /api/v1/employees/:id
 * Single employee detail from PostgreSQL.
 */
export async function getEmployeeById(id: string): Promise<EmployeeListItem> {
  console.log(`👤 [employeeService] getEmployeeById → id=${id}`);
  const res = await apiClient.get<EmployeeListItem>(`/api/v1/employees/${id}`);
  return res.data;
}

/**
 * POST /api/v1/employees/upload
 * Multipart upload of CSV or XLSX file.
 * Returns a job_id for polling progress.
 */
export async function uploadEmployeeFile(
  file: File,
  onUploadProgress?: (percent: number) => void
): Promise<BulkUploadResponse> {
  console.group('📁 [employeeService] uploadEmployeeFile');
  console.log('File:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);
  console.groupEnd();

  const form = new FormData();
  form.append('file', file);

  const res = await apiClient.post<BulkUploadResponse>(
    '/api/v1/employees/upload',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (ev) => {
        if (ev.total) {
          const pct = Math.round((ev.loaded / ev.total) * 100);
          console.log(`⬆️ [uploadEmployeeFile] Upload progress: ${pct}%`);
          onUploadProgress?.(pct);
        }
      },
    }
  );

  console.log('✅ [employeeService] Upload response:', res.data);
  return res.data;
}

/**
 * GET /api/v1/employees/upload/progress/:job_id
 * Poll processing status for a bulk upload job.
 */
export async function getUploadProgress(jobId: string): Promise<UploadProgressResponse> {
  const res = await apiClient.get<UploadProgressResponse>(
    `/api/v1/employees/upload/progress/${jobId}`
  );
  return res.data;
}
