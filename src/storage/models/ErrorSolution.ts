/**
 * ErrorSolution Model
 */

export interface ErrorSolution {
  id: number;
  error_pattern_id: number;

  // 해결책 정보
  solution_title: string;
  solution_description: string;
  solution_steps: string[];

  // 코드 변경사항
  files_modified?: string[];
  code_snippets?: Record<string, any>;

  // 효과 검증
  success_rate?: number;
  average_fix_time_minutes?: number;
  times_applied: number;

  // 참고 자료
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
