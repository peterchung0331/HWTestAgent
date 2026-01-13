/**
 * TypeScript type definitions for HWTestAgent frontend
 */

// Error Pattern Types
export interface ErrorPattern {
  id: number;
  project_name: string;
  error_message: string;
  error_category: ErrorCategory;
  error_hash: string;
  status_code?: number;
  method?: string;
  endpoint?: string;
  occurrence_count: number;
  first_seen: Date;
  last_seen: Date;
  context_data?: Record<string, any>;
  auto_fixed?: boolean;
  confidence_score?: number;
  created_at: Date;
  updated_at: Date;
}

export type ErrorCategory =
  | 'TIMEOUT'
  | 'DATABASE'
  | 'AUTH'
  | 'NETWORK'
  | 'VALIDATION'
  | 'RUNTIME'
  | 'API'
  | 'UNKNOWN';

// Error Solution Types
export interface ErrorSolution {
  id: number;
  error_pattern_id: number;
  solution_title: string;
  solution_description: string;
  solution_steps: string[];
  files_modified?: string[];
  code_snippets?: Record<string, any>;
  success_rate?: number;
  average_fix_time_minutes?: number;
  times_applied: number;
  reference_docs?: string[];
  related_commit_hash?: string;
  work_log_path?: string;
  created_at: Date;
  updated_at: Date;
}

// Error Occurrence Types
export interface ErrorOccurrence {
  id: number;
  error_pattern_id: number;
  occurred_at: Date;
  environment: string;
  project_name: string;
  stack_trace?: string;
  context_info?: Record<string, any>;
  resolved: boolean;
  resolved_at?: Date;
  solution_applied_id?: number;
  resolution_time_minutes?: number;
  test_run_id?: number;
  created_at: Date;
}

// Test Script Template Types
export interface TestScriptTemplate {
  id: number;
  template_name: string;
  template_type: TemplateType;
  description?: string;
  script_content: string;
  variables: Record<string, string>;
  times_used: number;
  success_rate?: number;
  average_execution_time_seconds?: number;
  applicable_projects?: string[];
  applicable_environments?: string[];
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export type TemplateType = 'e2e' | 'integration' | 'unit';

// Test Result Types
export interface TestRun {
  id: number;
  project_name: string;
  scenario_name: string;
  environment: 'production' | 'staging' | 'local' | 'docker';
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  started_at: Date;
  ended_at?: Date;
  duration_ms?: number;
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  auto_fixed_count?: number;
  retry_count?: number;
  triggered_by: 'manual' | 'schedule' | 'api' | 'webhook';
  trigger_source?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface TestStep {
  id: number;
  test_run_id: number;
  step_number: number;
  name: string;
  action: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  started_at: Date;
  ended_at?: Date;
  duration_ms?: number;
  error_message?: string;
  screenshot_path?: string;
  auto_fixed?: boolean;
  retry_count?: number;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface TestRunWithSteps {
  run: TestRun;
  steps: TestStep[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Filter Types
export interface ErrorPatternFilters {
  project?: string;
  category?: ErrorCategory;
  limit?: number;
  offset?: number;
  query?: string;
}

export interface TemplateFilters {
  type?: TemplateType;
  tags?: string[];
  limit?: number;
}

export interface TestResultFilters {
  project?: string;
  environment?: string;
  status?: string;
  limit?: number;
}

// Stats Types
export interface ErrorPatternStats {
  total_patterns: number;
  by_category: Record<ErrorCategory, number>;
  by_project: Record<string, number>;
  recent_occurrences: number;
  resolved_count: number;
}

export interface TestStatistics {
  total_runs: number;
  passed_runs: number;
  failed_runs: number;
  success_rate: number;
  average_duration_ms: number;
  total_steps: number;
  auto_fixed_count: number;
  by_environment: Record<string, number>;
}
