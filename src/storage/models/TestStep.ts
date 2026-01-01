/**
 * TestStep Model
 */

export interface TestStep {
  id: number;
  test_run_id: number;
  name: string;
  step_order: number;
  status: TestStepStatus;
  started_at?: Date;
  finished_at?: Date;
  duration_ms?: number;
  error_message?: string;
  response_data?: any;

  // Auto-fix fields
  auto_fixed: boolean;
  fix_description?: string;
  retry_attempt: number;

  created_at: Date;
}

export type TestStepStatus = 'PASSED' | 'FAILED' | 'SKIPPED';

export interface CreateTestStepInput {
  test_run_id: number;
  name: string;
  step_order: number;
  status: TestStepStatus;
  started_at: Date;
  finished_at?: Date;
  duration_ms?: number;
  error_message?: string;
  response_data?: any;
  auto_fixed?: boolean;
  fix_description?: string;
  retry_attempt?: number;
}

export interface UpdateTestStepInput {
  status?: TestStepStatus;
  finished_at?: Date;
  duration_ms?: number;
  error_message?: string;
  response_data?: any;
  auto_fixed?: boolean;
  fix_description?: string;
  retry_attempt?: number;
}
