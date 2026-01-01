/**
 * TestRun Model
 */

export interface TestRun {
  id: number;
  project_name: string;
  scenario_slug: string;
  status: TestRunStatus;
  environment: Environment;
  triggered_by: TriggerSource;
  started_at: Date;
  finished_at?: Date;
  duration_ms?: number;
  total_steps: number;
  passed_steps: number;
  failed_steps: number;

  // Auto-fix fields
  auto_fix_enabled: boolean;
  auto_fixed_count: number;
  retry_count: number;

  created_at: Date;
}

export type TestRunStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED';
export type Environment = 'production' | 'staging' | 'local';
export type TriggerSource = 'schedule' | 'manual' | 'webhook';

export interface CreateTestRunInput {
  project_name: string;
  scenario_slug: string;
  environment: Environment;
  triggered_by: TriggerSource;
  total_steps: number;
  auto_fix_enabled?: boolean;
}

export interface UpdateTestRunInput {
  status?: TestRunStatus;
  finished_at?: Date;
  duration_ms?: number;
  passed_steps?: number;
  failed_steps?: number;
  auto_fixed_count?: number;
  retry_count?: number;
}
