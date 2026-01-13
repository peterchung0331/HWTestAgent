/**
 * API client for HWTestAgent backend
 */

import type {
  ApiResponse,
  ErrorPattern,
  ErrorPatternFilters,
  ErrorPatternStats,
  ErrorSolution,
  TestRun,
  TestRunWithSteps,
  TestStatistics,
  TestScriptTemplate,
  TemplateFilters,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build query string from object
 */
function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(v => `${key}=${encodeURIComponent(v)}`).join('&');
      }
      return `${key}=${encodeURIComponent(value)}`;
    });
  return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}

// ============================================
// Error Pattern API
// ============================================

export async function getErrorPatterns(
  filters: ErrorPatternFilters = {}
): Promise<ApiResponse<ErrorPattern[]>> {
  const query = buildQueryString(filters);
  return fetchApi<ErrorPattern[]>(`/error-patterns${query}`);
}

export async function getErrorPatternById(
  id: number
): Promise<ApiResponse<{ pattern: ErrorPattern; solutions: ErrorSolution[] }>> {
  return fetchApi(`/error-patterns/${id}`);
}

export async function getErrorPatternStats(
  project?: string
): Promise<ApiResponse<ErrorPatternStats>> {
  const query = project ? `?project=${project}` : '';
  return fetchApi<ErrorPatternStats>(`/error-patterns/stats${query}`);
}

export async function recordErrorOccurrence(
  data: {
    error_pattern_id: number;
    environment: string;
    project_name: string;
    stack_trace?: string;
    context_info?: Record<string, any>;
    test_run_id?: number;
  }
): Promise<ApiResponse<any>> {
  return fetchApi('/error-patterns/record', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================
// Test Results API
// ============================================

export async function getTestResults(
  limit = 50,
  project?: string
): Promise<ApiResponse<TestRun[]>> {
  const query = buildQueryString({ limit, project });
  return fetchApi<TestRun[]>(`/test/results${query}`);
}

export async function getTestResultById(
  id: number
): Promise<ApiResponse<TestRunWithSteps>> {
  return fetchApi<TestRunWithSteps>(`/test/results/${id}`);
}

export async function getTestStatistics(
  project: string,
  days = 30
): Promise<ApiResponse<TestStatistics>> {
  return fetchApi<TestStatistics>(`/test/stats/${project}?days=${days}`);
}

// ============================================
// Template API
// ============================================

export async function getTemplates(
  filters: TemplateFilters = {}
): Promise<ApiResponse<TestScriptTemplate[]>> {
  const query = buildQueryString(filters);
  return fetchApi<TestScriptTemplate[]>(`/templates${query}`);
}

export async function getTemplateById(
  id: number
): Promise<ApiResponse<TestScriptTemplate>> {
  return fetchApi<TestScriptTemplate>(`/templates/${id}`);
}

export async function generateScriptFromTemplate(
  id: number,
  variables: Record<string, string>
): Promise<ApiResponse<{ script: string; template_name: string }>> {
  return fetchApi(`/templates/${id}/generate`, {
    method: 'POST',
    body: JSON.stringify({ variables }),
  });
}

// ============================================
// Health Check API
// ============================================

export async function getHealthStatus(): Promise<ApiResponse<{
  status: string;
  timestamp: string;
  version: string;
}>> {
  return fetchApi('/health');
}
