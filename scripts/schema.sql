-- HWTestAgent Database Schema
-- PostgreSQL Schema for Test Management, Auto-Fix, and Self-Learning

-- ============================================
-- Core Test Management Tables
-- ============================================

-- Test Runs Table
CREATE TABLE IF NOT EXISTS test_runs (
  id SERIAL PRIMARY KEY,
  project_name VARCHAR(100) NOT NULL,
  scenario_slug VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,          -- 'PENDING', 'RUNNING', 'PASSED', 'FAILED'
  environment VARCHAR(20) NOT NULL,     -- 'production', 'staging', 'local'
  triggered_by VARCHAR(20) NOT NULL,    -- 'schedule', 'manual', 'webhook'
  started_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP,
  duration_ms INTEGER,
  total_steps INTEGER,
  passed_steps INTEGER,
  failed_steps INTEGER,

  -- Auto-fix fields
  auto_fix_enabled BOOLEAN DEFAULT TRUE,
  auto_fixed_count INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Test Steps Table
CREATE TABLE IF NOT EXISTS test_steps (
  id SERIAL PRIMARY KEY,
  test_run_id INTEGER REFERENCES test_runs(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  step_order INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,         -- 'PASSED', 'FAILED', 'SKIPPED'
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  duration_ms INTEGER,
  error_message TEXT,
  response_data JSONB,

  -- Auto-fix fields
  auto_fixed BOOLEAN DEFAULT FALSE,
  fix_description TEXT,
  retry_attempt INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Self-Learning Tables
-- ============================================

-- Error Patterns Tracking
CREATE TABLE IF NOT EXISTS error_patterns (
  id SERIAL PRIMARY KEY,
  project_name VARCHAR(100) NOT NULL,
  error_hash VARCHAR(64) NOT NULL,      -- MD5 hash of error signature
  error_message TEXT NOT NULL,
  error_category VARCHAR(50),            -- 'TIMEOUT', 'DATABASE', 'AUTH', 'RATE_LIMIT', etc.
  endpoint VARCHAR(500),
  method VARCHAR(10),
  status_code INTEGER,
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  occurrence_count INTEGER DEFAULT 1,
  scenario_generated BOOLEAN DEFAULT FALSE,
  scenario_id INTEGER,
  confidence DECIMAL(5,2) DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(project_name, error_hash)
);

-- Scenarios Table
CREATE TABLE IF NOT EXISTS scenarios (
  id SERIAL PRIMARY KEY,
  project_name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  scenario_type VARCHAR(20) NOT NULL,   -- 'PRECISION', 'SSO', 'API', 'E2E'
  environment VARCHAR(20) DEFAULT 'production',

  -- Content
  yaml_content TEXT NOT NULL,

  -- Auto-generation flags
  auto_generated BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMP,
  confidence DECIMAL(5,2),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(project_name, slug)
);

-- Scenario Metrics (Utility Analysis)
CREATE TABLE IF NOT EXISTS scenario_metrics (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
  calculated_at TIMESTAMP DEFAULT NOW(),

  -- Metrics
  execution_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  avg_duration_ms INTEGER,
  last_executed_at TIMESTAMP,
  last_failure_at TIMESTAMP,

  -- Utility score
  utility_score DECIMAL(5,2),
  recommendation VARCHAR(20),             -- 'KEEP', 'REVIEW', 'ARCHIVE', 'DELETE'

  -- Analysis period
  period_days INTEGER DEFAULT 90,

  UNIQUE(scenario_id, calculated_at)
);

-- Scenario Archive (Deleted Scenarios Backup)
CREATE TABLE IF NOT EXISTS scenario_archive (
  id SERIAL PRIMARY KEY,
  original_scenario_id INTEGER,
  scenario_data JSONB NOT NULL,           -- Full scenario backup
  archived_reason TEXT,
  utility_score DECIMAL(5,2),
  archived_at TIMESTAMP DEFAULT NOW(),
  can_restore BOOLEAN DEFAULT TRUE
);

-- Scenario Improvements History
CREATE TABLE IF NOT EXISTS scenario_improvements (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
  improvement_type VARCHAR(50),            -- 'TIMEOUT_ADJUSTED', 'DELAY_ADDED', etc.
  before_value JSONB,
  after_value JSONB,
  reason TEXT,
  applied_by VARCHAR(20) DEFAULT 'AUTO',  -- 'AUTO' or 'MANUAL'
  applied_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Test Runs Indexes
CREATE INDEX idx_test_runs_project ON test_runs(project_name, scenario_slug);
CREATE INDEX idx_test_runs_created ON test_runs(created_at DESC);
CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_test_runs_environment ON test_runs(environment);

-- Test Steps Indexes
CREATE INDEX idx_test_steps_run ON test_steps(test_run_id);
CREATE INDEX idx_test_steps_status ON test_steps(status);

-- Error Patterns Indexes
CREATE INDEX idx_error_patterns_project ON error_patterns(project_name, last_seen DESC);
CREATE INDEX idx_error_patterns_count ON error_patterns(occurrence_count DESC);
CREATE INDEX idx_error_patterns_hash ON error_patterns(error_hash);
CREATE INDEX idx_error_patterns_category ON error_patterns(error_category);

-- Scenarios Indexes
CREATE INDEX idx_scenarios_project ON scenarios(project_name);
CREATE INDEX idx_scenarios_type ON scenarios(scenario_type);
CREATE INDEX idx_scenarios_auto ON scenarios(auto_generated);

-- Scenario Metrics Indexes
CREATE INDEX idx_scenario_metrics_score ON scenario_metrics(utility_score);
CREATE INDEX idx_scenario_metrics_scenario ON scenario_metrics(scenario_id, calculated_at DESC);

-- ============================================
-- Views for Quick Access
-- ============================================

-- Recent Test Results View
CREATE OR REPLACE VIEW v_recent_test_results AS
SELECT
  tr.id,
  tr.project_name,
  tr.scenario_slug,
  tr.status,
  tr.environment,
  tr.triggered_by,
  tr.started_at,
  tr.finished_at,
  tr.duration_ms,
  tr.total_steps,
  tr.passed_steps,
  tr.failed_steps,
  tr.auto_fix_enabled,
  tr.auto_fixed_count,
  tr.retry_count,
  ROUND((tr.passed_steps::DECIMAL / NULLIF(tr.total_steps, 0)) * 100, 2) as success_percentage
FROM test_runs tr
ORDER BY tr.created_at DESC
LIMIT 100;

-- Error Pattern Summary View
CREATE OR REPLACE VIEW v_error_pattern_summary AS
SELECT
  ep.id,
  ep.project_name,
  ep.error_category,
  ep.error_message,
  ep.occurrence_count,
  ep.first_seen,
  ep.last_seen,
  ep.scenario_generated,
  ep.confidence,
  DATE_PART('day', NOW() - ep.last_seen) as days_since_last_occurrence
FROM error_patterns ep
WHERE ep.occurrence_count >= 3
  AND ep.scenario_generated = FALSE
ORDER BY ep.occurrence_count DESC, ep.last_seen DESC;

-- Low Utility Scenarios View
CREATE OR REPLACE VIEW v_low_utility_scenarios AS
SELECT
  s.id,
  s.project_name,
  s.name,
  s.auto_generated,
  sm.utility_score,
  sm.recommendation,
  sm.execution_count,
  sm.success_rate,
  sm.last_executed_at,
  sm.last_failure_at
FROM scenarios s
JOIN scenario_metrics sm ON s.id = sm.scenario_id
WHERE sm.utility_score < 40
  AND sm.calculated_at = (
    SELECT MAX(calculated_at)
    FROM scenario_metrics
    WHERE scenario_id = s.id
  )
ORDER BY sm.utility_score ASC;

-- ============================================
-- Functions
-- ============================================

-- Update scenario updated_at timestamp
CREATE OR REPLACE FUNCTION update_scenario_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scenario_timestamp
BEFORE UPDATE ON scenarios
FOR EACH ROW
EXECUTE FUNCTION update_scenario_timestamp();

-- ============================================
-- Initial Data
-- ============================================

-- Insert default configuration (if needed)
-- This will be populated by the application

COMMENT ON TABLE test_runs IS 'Main test execution records';
COMMENT ON TABLE test_steps IS 'Individual test step results within a test run';
COMMENT ON TABLE error_patterns IS 'Tracked error patterns for self-learning';
COMMENT ON TABLE scenarios IS 'Test scenario definitions';
COMMENT ON TABLE scenario_metrics IS 'Scenario utility analysis metrics';
COMMENT ON TABLE scenario_archive IS 'Archive of deleted scenarios for restoration';
COMMENT ON TABLE scenario_improvements IS 'History of automated scenario improvements';

-- ============================================
-- Reno AI Bot Test Details
-- ============================================

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
CREATE INDEX idx_reno_test_details_step ON reno_test_details(test_step_id);
CREATE INDEX idx_reno_test_details_case ON reno_test_details(test_case_id);
CREATE INDEX idx_reno_test_details_score ON reno_test_details(overall_score);
CREATE INDEX idx_reno_test_details_created ON reno_test_details(created_at DESC);

COMMENT ON TABLE reno_test_details IS 'Reno AI bot test case details from WBSalesHub';
