/**
 * Test Repository
 * Database operations for test runs and steps
 */

import { query, getClient } from '../db.js';
import {
  TestRun,
  TestRunStatus,
  CreateTestRunInput,
  UpdateTestRunInput
} from '../models/TestRun.js';
import {
  TestStep,
  CreateTestStepInput,
  UpdateTestStepInput
} from '../models/TestStep.js';

export class TestRepository {
  /**
   * Create a new test run
   */
  async createTestRun(input: CreateTestRunInput): Promise<TestRun> {
    const result = await query<TestRun>(`
      INSERT INTO test_runs (
        project_name,
        scenario_slug,
        status,
        environment,
        triggered_by,
        total_steps,
        auto_fix_enabled,
        passed_steps,
        failed_steps
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0)
      RETURNING *
    `, [
      input.project_name,
      input.scenario_slug,
      'RUNNING' as TestRunStatus,
      input.environment,
      input.triggered_by,
      input.total_steps,
      input.auto_fix_enabled ?? true
    ]);

    return result.rows[0];
  }

  /**
   * Update a test run
   */
  async updateTestRun(id: number, input: UpdateTestRunInput): Promise<TestRun | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }
    if (input.finished_at !== undefined) {
      fields.push(`finished_at = $${paramIndex++}`);
      values.push(input.finished_at);
    }
    if (input.duration_ms !== undefined) {
      fields.push(`duration_ms = $${paramIndex++}`);
      values.push(input.duration_ms);
    }
    if (input.passed_steps !== undefined) {
      fields.push(`passed_steps = $${paramIndex++}`);
      values.push(input.passed_steps);
    }
    if (input.failed_steps !== undefined) {
      fields.push(`failed_steps = $${paramIndex++}`);
      values.push(input.failed_steps);
    }
    if (input.auto_fixed_count !== undefined) {
      fields.push(`auto_fixed_count = $${paramIndex++}`);
      values.push(input.auto_fixed_count);
    }
    if (input.retry_count !== undefined) {
      fields.push(`retry_count = $${paramIndex++}`);
      values.push(input.retry_count);
    }

    if (fields.length === 0) {
      return null;
    }

    values.push(id);

    const result = await query<TestRun>(`
      UPDATE test_runs
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  }

  /**
   * Get test run by ID
   */
  async getTestRunById(id: number): Promise<TestRun | null> {
    const result = await query<TestRun>(`
      SELECT * FROM test_runs WHERE id = $1
    `, [id]);

    return result.rows[0] || null;
  }

  /**
   * Get recent test runs
   */
  async getRecentTestRuns(limit: number = 10, projectName?: string): Promise<TestRun[]> {
    let sql = `
      SELECT * FROM test_runs
      WHERE 1=1
    `;
    const params: any[] = [];

    if (projectName) {
      params.push(projectName);
      sql += ` AND project_name = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query<TestRun>(sql, params);
    return result.rows;
  }

  /**
   * Create a test step
   */
  async createTestStep(input: CreateTestStepInput): Promise<TestStep> {
    const result = await query<TestStep>(`
      INSERT INTO test_steps (
        test_run_id,
        name,
        step_order,
        status,
        started_at,
        finished_at,
        duration_ms,
        error_message,
        response_data,
        auto_fixed,
        fix_description,
        retry_attempt
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      input.test_run_id,
      input.name,
      input.step_order,
      input.status,
      input.started_at,
      input.finished_at || null,
      input.duration_ms || null,
      input.error_message || null,
      input.response_data ? JSON.stringify(input.response_data) : null,
      input.auto_fixed || false,
      input.fix_description || null,
      input.retry_attempt || 0
    ]);

    return result.rows[0];
  }

  /**
   * Get steps for a test run
   */
  async getTestStepsByRunId(runId: number): Promise<TestStep[]> {
    const result = await query<TestStep>(`
      SELECT * FROM test_steps
      WHERE test_run_id = $1
      ORDER BY step_order ASC
    `, [runId]);

    return result.rows;
  }

  /**
   * Get test run with steps
   */
  async getTestRunWithSteps(runId: number): Promise<{ run: TestRun; steps: TestStep[] } | null> {
    const run = await this.getTestRunById(runId);
    if (!run) return null;

    const steps = await this.getTestStepsByRunId(runId);

    return { run, steps };
  }

  /**
   * Get test runs by date range
   */
  async getTestRunsByDateRange(
    projectName: string,
    startDate: Date,
    endDate: Date
  ): Promise<TestRun[]> {
    const result = await query<TestRun>(`
      SELECT * FROM test_runs
      WHERE project_name = $1
        AND created_at >= $2
        AND created_at <= $3
      ORDER BY created_at DESC
    `, [projectName, startDate, endDate]);

    return result.rows;
  }

  /**
   * Get test statistics
   */
  async getTestStatistics(projectName: string, days: number = 30): Promise<{
    total_runs: number;
    passed_runs: number;
    failed_runs: number;
    success_rate: number;
    avg_duration_ms: number;
    total_auto_fixes: number;
  }> {
    const result = await query(`
      SELECT
        COUNT(*) as total_runs,
        SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) as passed_runs,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_runs,
        ROUND(
          (SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
          2
        ) as success_rate,
        ROUND(AVG(duration_ms)) as avg_duration_ms,
        SUM(auto_fixed_count) as total_auto_fixes
      FROM test_runs
      WHERE project_name = $1
        AND created_at >= NOW() - INTERVAL '${days} days'
    `, [projectName]);

    return result.rows[0] || {
      total_runs: 0,
      passed_runs: 0,
      failed_runs: 0,
      success_rate: 0,
      avg_duration_ms: 0,
      total_auto_fixes: 0
    };
  }
}

export default new TestRepository();
