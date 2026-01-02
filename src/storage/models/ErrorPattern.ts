/**
 * ErrorPattern Model
 */

export interface ErrorPattern {
  id: number;
  project_name: string;
  error_hash: string;
  error_message: string;
  error_category?: ErrorCategory;
  endpoint?: string;
  method?: string;
  status_code?: number;
  first_seen: Date;
  last_seen: Date;
  occurrence_count: number;
  scenario_generated: boolean;
  scenario_id?: number;
  confidence: number;
  created_at: Date;
}

export type ErrorCategory =
  | 'TIMEOUT'
  | 'DATABASE'
  | 'AUTH'
  | 'RATE_LIMIT'
  | 'JWT_KEY'
  | 'ENV_VAR'
  | 'SERVICE_DOWN'
  | 'UNKNOWN';

export interface CreateErrorPatternInput {
  project_name: string;
  error_hash: string;
  error_message: string;
  error_category?: ErrorCategory;
  endpoint?: string;
  method?: string;
  status_code?: number;
  confidence?: number;
}

export interface UpdateErrorPatternInput {
  occurrence_count?: number;
  last_seen?: Date;
  scenario_generated?: boolean;
  scenario_id?: number;
  confidence?: number;
}
