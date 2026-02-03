-- Migration: 001_reno_test_details
-- Created: 2026-02-04
-- Description: Add Reno AI bot test details table

-- Reno 테스트 상세 결과 테이블
CREATE TABLE IF NOT EXISTS reno_test_details (
  id SERIAL PRIMARY KEY,
  test_step_id INTEGER REFERENCES test_steps(id) ON DELETE CASCADE,
  test_case_id VARCHAR(100) NOT NULL,       -- WBSalesHub 테스트케이스 ID
  test_case_name VARCHAR(200),

  -- 입출력
  input_message TEXT NOT NULL,
  actual_response TEXT,

  -- 도구 호출 정보
  tool_calls JSONB,                          -- [{name, input, output, timestamp}]

  -- 평가 점수
  overall_score DECIMAL(5,4),                -- 0.0000 ~ 1.0000

  -- 도구 평가 상세
  tool_evaluation JSONB,                     -- {passed, expectedTools, actualTools, ...}

  -- 응답 평가 상세
  response_evaluation JSONB,                 -- {passed, conceptCoverage, foundConcepts, ...}

  -- 개선 제안
  suggestions TEXT[],

  -- 에러 정보
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reno 테스트 인덱스
CREATE INDEX IF NOT EXISTS idx_reno_test_details_step ON reno_test_details(test_step_id);
CREATE INDEX IF NOT EXISTS idx_reno_test_details_case ON reno_test_details(test_case_id);
CREATE INDEX IF NOT EXISTS idx_reno_test_details_score ON reno_test_details(overall_score);
CREATE INDEX IF NOT EXISTS idx_reno_test_details_created ON reno_test_details(created_at DESC);

COMMENT ON TABLE reno_test_details IS 'Reno AI bot test case details from WBSalesHub';

-- error_patterns 테이블에 Reno 카테고리 허용 (이미 VARCHAR이므로 별도 변경 불필요)
-- 새로운 카테고리: RENO_TOOL_MISSING, RENO_TOOL_ARGS, RENO_CONCEPT_MISSING,
--                RENO_FORBIDDEN_TERM, RENO_FORMATTING, RENO_TONE
