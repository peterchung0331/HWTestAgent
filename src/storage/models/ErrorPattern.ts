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
  // Reno AI 봇 관련 에러 카테고리
  | 'RENO_TOOL_MISSING'    // 필수 도구 미호출
  | 'RENO_TOOL_ARGS'       // 도구 인자 불일치
  | 'RENO_CONCEPT_MISSING' // 필수 개념 누락
  | 'RENO_FORBIDDEN_TERM'  // 금지어 사용
  | 'RENO_FORMATTING'      // Slack 포맷팅 오류
  | 'RENO_TONE'            // 어조 불일치
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
