/**
 * Error Reporter Utility
 *
 * 테스트 실행 중 발생한 에러를 자동으로 HWTestAgent 에러 DB에 기록합니다.
 *
 * 사용처:
 * - 스킬테스터-E2E: Playwright 테스트 실패 시
 * - 스킬테스터-단위: Jest/Vitest 테스트 실패 시
 * - 스킬테스터-통합: API 테스트 실패 시
 */

import axios from 'axios';
import crypto from 'crypto';

const API_BASE_URL = process.env.HWTESTAGENT_API_URL || 'http://localhost:4100/api';

export interface ErrorReportInput {
  project_name: string;
  error_message: string;
  error_category?: 'TIMEOUT' | 'DATABASE' | 'AUTH' | 'NETWORK' | 'VALIDATION' | 'RUNTIME' | 'API' | 'UNKNOWN';
  status_code?: number;
  method?: string;
  endpoint?: string;
  stack_trace?: string;
  environment: 'local' | 'staging' | 'production' | 'docker';
  test_run_id?: number;
  context_info?: Record<string, any>;
}

/**
 * 에러를 에러 패턴 DB에 기록합니다.
 *
 * @param error 에러 정보
 * @returns 생성된 에러 패턴 ID 또는 null
 */
export async function reportError(error: ErrorReportInput): Promise<number | null> {
  try {
    // 에러 해시 생성 (중복 방지)
    const errorHash = crypto
      .createHash('md5')
      .update(`${error.project_name}:${error.error_message}`)
      .digest('hex');

    // 에러 패턴 upsert (이미 존재하면 occurrence_count 증가)
    const response = await axios.post(`${API_BASE_URL}/error-patterns/record`, {
      project_name: error.project_name,
      error_message: error.error_message,
      error_category: error.error_category || 'UNKNOWN',
      error_hash: errorHash,
      status_code: error.status_code,
      method: error.method,
      endpoint: error.endpoint,
      environment: error.environment,
      stack_trace: error.stack_trace,
      context_info: error.context_info,
      test_run_id: error.test_run_id,
    });

    if (response.data.success && response.data.data) {
      console.log(`✅ 에러가 DB에 기록되었습니다 (ID: ${response.data.data.error_pattern_id})`);
      return response.data.data.error_pattern_id;
    }

    return null;
  } catch (err) {
    console.error('❌ 에러 DB 기록 실패:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Playwright 테스트 에러를 기록합니다.
 *
 * @param project 프로젝트 이름 (WBHubManager, WBSalesHub 등)
 * @param error Playwright 에러 객체
 * @param environment 환경 (local, staging, production)
 * @param testRunId 테스트 실행 ID (옵션)
 */
export async function reportPlaywrightError(
  project: string,
  error: Error,
  environment: 'local' | 'staging' | 'production' | 'docker',
  testRunId?: number
): Promise<number | null> {
  // 에러 메시지에서 카테고리 추론
  let category: ErrorReportInput['error_category'] = 'UNKNOWN';

  if (error.message.includes('timeout') || error.message.includes('Timeout')) {
    category = 'TIMEOUT';
  } else if (error.message.includes('Navigation') || error.message.includes('net::')) {
    category = 'NETWORK';
  } else if (error.message.includes('401') || error.message.includes('403')) {
    category = 'AUTH';
  } else if (error.message.includes('500') || error.message.includes('502')) {
    category = 'API';
  }

  return reportError({
    project_name: project,
    error_message: error.message,
    error_category: category,
    stack_trace: error.stack,
    environment,
    test_run_id: testRunId,
    context_info: {
      test_type: 'e2e',
      browser: 'chromium',
    },
  });
}

/**
 * Jest/Vitest 테스트 에러를 기록합니다.
 *
 * @param project 프로젝트 이름
 * @param error Jest/Vitest 에러 객체
 * @param testRunId 테스트 실행 ID (옵션)
 */
export async function reportJestError(
  project: string,
  error: Error,
  testRunId?: number
): Promise<number | null> {
  return reportError({
    project_name: project,
    error_message: error.message,
    error_category: 'RUNTIME',
    stack_trace: error.stack,
    environment: 'local',
    test_run_id: testRunId,
    context_info: {
      test_type: 'unit',
    },
  });
}

/**
 * API 통합 테스트 에러를 기록합니다.
 *
 * @param project 프로젝트 이름
 * @param error 에러 객체
 * @param method HTTP 메서드
 * @param endpoint API 엔드포인트
 * @param statusCode HTTP 상태 코드
 * @param environment 환경
 * @param testRunId 테스트 실행 ID (옵션)
 */
export async function reportApiError(
  project: string,
  error: Error,
  method: string,
  endpoint: string,
  statusCode?: number,
  environment: 'local' | 'staging' | 'production' | 'docker' = 'local',
  testRunId?: number
): Promise<number | null> {
  let category: ErrorReportInput['error_category'] = 'API';

  if (statusCode === 401 || statusCode === 403) {
    category = 'AUTH';
  } else if (statusCode && statusCode >= 500) {
    category = 'DATABASE';
  } else if (error.message.includes('timeout')) {
    category = 'TIMEOUT';
  } else if (error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
    category = 'NETWORK';
  }

  return reportError({
    project_name: project,
    error_message: error.message,
    error_category: category,
    status_code: statusCode,
    method,
    endpoint,
    stack_trace: error.stack,
    environment,
    test_run_id: testRunId,
    context_info: {
      test_type: 'integration',
    },
  });
}

/**
 * 에러 DB에서 유사한 패턴을 검색합니다.
 *
 * @param errorMessage 에러 메시지
 * @param project 프로젝트 이름 (옵션)
 * @returns 유사한 에러 패턴 목록
 */
export async function searchSimilarErrors(
  errorMessage: string,
  project?: string
): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      query: errorMessage,
      limit: '5',
    });

    if (project) {
      params.append('project', project);
    }

    const response = await axios.get(`${API_BASE_URL}/error-patterns?${params}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    return [];
  } catch (err) {
    console.error('❌ 에러 검색 실패:', err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * 에러 패턴의 솔루션을 가져옵니다.
 *
 * @param errorPatternId 에러 패턴 ID
 * @returns 솔루션 목록
 */
export async function getErrorSolutions(errorPatternId: number): Promise<any[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/error-patterns/${errorPatternId}`);

    if (response.data.success && response.data.data) {
      return response.data.data.solutions || [];
    }

    return [];
  } catch (err) {
    console.error('❌ 솔루션 조회 실패:', err instanceof Error ? err.message : err);
    return [];
  }
}
