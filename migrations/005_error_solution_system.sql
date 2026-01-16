-- Migration 005: Error Solution System
-- 에러 패턴 DB 및 테스트 스크립트 재사용 시스템
-- Date: 2026-01-14

-- ============================================
-- Error Solution Tables
-- ============================================

-- Error Solutions Table (에러 해결책)
CREATE TABLE IF NOT EXISTS error_solutions (
  id SERIAL PRIMARY KEY,
  error_pattern_id INTEGER REFERENCES error_patterns(id) ON DELETE CASCADE,

  -- 해결책 정보
  solution_title VARCHAR(200) NOT NULL,
  solution_description TEXT NOT NULL,
  solution_steps TEXT[] NOT NULL,       -- 해결 단계 배열

  -- 코드 변경사항
  files_modified TEXT[],                -- 수정된 파일 경로
  code_snippets JSONB,                  -- { "file_path": "before/after code" }

  -- 효과 검증
  success_rate DECIMAL(5,2),            -- 해결 성공률 (0-100)
  average_fix_time_minutes INTEGER,    -- 평균 해결 시간
  times_applied INTEGER DEFAULT 0,      -- 적용 횟수

  -- 참고 자료
  reference_docs TEXT[],                -- 참고 문서 링크
  related_commit_hash VARCHAR(40),      -- Git 커밋 해시
  work_log_path TEXT,                   -- 작업기록 파일 경로

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Error Occurrences Table (에러 발생 이력)
CREATE TABLE IF NOT EXISTS error_occurrences (
  id SERIAL PRIMARY KEY,
  error_pattern_id INTEGER REFERENCES error_patterns(id) ON DELETE CASCADE,

  -- 발생 정보
  occurred_at TIMESTAMP DEFAULT NOW(),
  environment VARCHAR(20) NOT NULL,
  project_name VARCHAR(50) NOT NULL,

  -- 상세 정보
  stack_trace TEXT,
  context_info JSONB,                   -- 추가 컨텍스트 정보

  -- 해결 여부
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  solution_applied_id INTEGER REFERENCES error_solutions(id),
  resolution_time_minutes INTEGER,

  -- 테스트 실행 연동
  test_run_id INTEGER REFERENCES test_runs(id),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Test Script Templates Table (테스트 스크립트 템플릿)
CREATE TABLE IF NOT EXISTS test_script_templates (
  id SERIAL PRIMARY KEY,

  -- 템플릿 식별
  template_name VARCHAR(100) UNIQUE NOT NULL,
  template_type VARCHAR(20) NOT NULL,  -- 'e2e', 'integration', 'unit'
  description TEXT,

  -- 템플릿 내용
  script_content TEXT NOT NULL,        -- Playwright/Jest 스크립트
  variables JSONB NOT NULL,            -- { "PROJECT_NAME": "string", "BASE_URL": "string" }

  -- 사용 통계
  times_used INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  average_execution_time_seconds INTEGER,

  -- 적용 범위
  applicable_projects TEXT[],          -- ['WBHubManager', 'WBSalesHub']
  applicable_environments TEXT[],      -- ['local', 'staging', 'production']

  -- 태그
  tags TEXT[],                         -- ['sso', 'oauth', 'navigation']

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Error Solutions Indexes
CREATE INDEX idx_error_solution_pattern ON error_solutions(error_pattern_id);
CREATE INDEX idx_success_rate ON error_solutions(success_rate DESC);

-- Error Occurrences Indexes
CREATE INDEX idx_error_occurrence_pattern ON error_occurrences(error_pattern_id);
CREATE INDEX idx_occurrence_date ON error_occurrences(occurred_at DESC);
CREATE INDEX idx_resolved ON error_occurrences(resolved);

-- Test Script Templates Indexes
CREATE INDEX idx_template_type ON test_script_templates(template_type);
CREATE INDEX idx_template_tags ON test_script_templates USING gin(tags);

-- ============================================
-- Triggers for Automatic Updates
-- ============================================

-- Update error_solutions updated_at timestamp
CREATE OR REPLACE FUNCTION update_error_solutions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_error_solutions_timestamp
BEFORE UPDATE ON error_solutions
FOR EACH ROW
EXECUTE FUNCTION update_error_solutions_timestamp();

-- Update test_script_templates updated_at timestamp
CREATE OR REPLACE FUNCTION update_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_templates_timestamp
BEFORE UPDATE ON test_script_templates
FOR EACH ROW
EXECUTE FUNCTION update_templates_timestamp();

-- ============================================
-- Views for Error Pattern System
-- ============================================

-- Error Patterns with Solutions View
CREATE OR REPLACE VIEW v_error_patterns_with_solutions AS
SELECT
  ep.id,
  ep.project_name,
  ep.error_message,
  ep.error_category,
  ep.occurrence_count,
  ep.first_seen,
  ep.last_seen,
  COUNT(es.id) as solution_count,
  MAX(es.success_rate) as best_solution_success_rate,
  SUM(es.times_applied) as total_solutions_applied
FROM error_patterns ep
LEFT JOIN error_solutions es ON ep.id = es.error_pattern_id
GROUP BY ep.id
ORDER BY ep.occurrence_count DESC, ep.last_seen DESC;

-- Recent Unresolved Errors View
CREATE OR REPLACE VIEW v_recent_unresolved_errors AS
SELECT
  eo.id,
  eo.project_name,
  eo.environment,
  eo.occurred_at,
  ep.error_message,
  ep.error_category,
  eo.stack_trace,
  DATE_PART('hour', NOW() - eo.occurred_at) as hours_since_occurrence
FROM error_occurrences eo
JOIN error_patterns ep ON eo.error_pattern_id = ep.id
WHERE eo.resolved = FALSE
ORDER BY eo.occurred_at DESC
LIMIT 50;

-- Template Usage Statistics View
CREATE OR REPLACE VIEW v_template_usage_stats AS
SELECT
  id,
  template_name,
  template_type,
  times_used,
  success_rate,
  average_execution_time_seconds,
  CASE
    WHEN times_used = 0 THEN 'UNUSED'
    WHEN success_rate >= 90 THEN 'EXCELLENT'
    WHEN success_rate >= 70 THEN 'GOOD'
    WHEN success_rate >= 50 THEN 'NEEDS_IMPROVEMENT'
    ELSE 'POOR'
  END as quality_rating,
  created_at
FROM test_script_templates
ORDER BY times_used DESC, success_rate DESC;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE error_solutions IS 'Solutions and fixes for known error patterns';
COMMENT ON TABLE error_occurrences IS 'Historical records of error occurrences';
COMMENT ON TABLE test_script_templates IS 'Reusable test script templates with variable substitution';

COMMENT ON COLUMN error_solutions.solution_steps IS 'Array of step-by-step instructions to resolve the error';
COMMENT ON COLUMN error_solutions.code_snippets IS 'JSON object containing before/after code snippets';
COMMENT ON COLUMN error_solutions.success_rate IS 'Percentage of successful resolutions (0-100)';

COMMENT ON COLUMN error_occurrences.resolved IS 'Whether this occurrence has been resolved';
COMMENT ON COLUMN error_occurrences.context_info IS 'Additional context (browser info, user agent, etc)';

COMMENT ON COLUMN test_script_templates.variables IS 'JSON object defining required variables (e.g., {"PROJECT_NAME": "string"})';
COMMENT ON COLUMN test_script_templates.tags IS 'Tags for categorizing templates (e.g., ["sso", "oauth"])';
