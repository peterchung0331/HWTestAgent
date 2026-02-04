/**
 * ErrorSolution Model
 */

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

export interface CreateErrorSolutionInput {
  error_pattern_id: number;
  solution_title: string;
  solution_description: string;
  solution_steps: string[];
  files_modified?: string[];
  code_snippets?: Record<string, any>;
  reference_docs?: string[];
  related_commit_hash?: string;
  work_log_path?: string;
}

export interface UpdateErrorSolutionInput {
  solution_title?: string;
  solution_description?: string;
  solution_steps?: string[];
  files_modified?: string[];
  code_snippets?: Record<string, any>;
  success_rate?: number;
  average_fix_time_minutes?: number;
  times_applied?: number;
  reference_docs?: string[];
  related_commit_hash?: string;
  work_log_path?: string;
}
