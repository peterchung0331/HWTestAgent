/**
 * ErrorOccurrence Model
 */

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

export interface CreateErrorOccurrenceInput {
  error_pattern_id: number;
  environment: string;
  project_name: string;
  stack_trace?: string;
  context_info?: Record<string, any>;
  test_run_id?: number;
}

export interface UpdateErrorOccurrenceInput {
  resolved?: boolean;
  resolved_at?: Date;
  solution_applied_id?: number;
  resolution_time_minutes?: number;
}
