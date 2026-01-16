/**
 * Error Pattern Repository
 * Database operations for error patterns, solutions, and occurrences
 */

import { query } from '../db.js';
import {
  ErrorPattern,
  CreateErrorPatternInput,
  UpdateErrorPatternInput
} from '../models/ErrorPattern.js';
import {
  ErrorSolution,
  CreateErrorSolutionInput,
  UpdateErrorSolutionInput
} from '../models/ErrorSolution.js';
import {
  ErrorOccurrence,
  CreateErrorOccurrenceInput,
  UpdateErrorOccurrenceInput
} from '../models/ErrorOccurrence.js';

export class ErrorPatternRepository {
  /**
   * Create or update an error pattern (upsert by error_hash)
   */
  async upsertErrorPattern(input: CreateErrorPatternInput): Promise<ErrorPattern> {
    const result = await query<ErrorPattern>(`
      INSERT INTO error_patterns (
        project_name,
        error_hash,
        error_message,
        error_category,
        endpoint,
        method,
        status_code,
        confidence,
        occurrence_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
      ON CONFLICT (project_name, error_hash)
      DO UPDATE SET
        occurrence_count = error_patterns.occurrence_count + 1,
        last_seen = NOW()
      RETURNING *
    `, [
      input.project_name,
      input.error_hash,
      input.error_message,
      input.error_category || null,
      input.endpoint || null,
      input.method || null,
      input.status_code || null,
      input.confidence || 0.0
    ]);

    return result.rows[0];
  }

  /**
   * Get error pattern by ID
   */
  async getErrorPatternById(id: number): Promise<ErrorPattern | null> {
    const result = await query<ErrorPattern>(`
      SELECT * FROM error_patterns WHERE id = $1
    `, [id]);

    return result.rows[0] || null;
  }

  /**
   * Search error patterns (text similarity + filters)
   */
  async searchErrorPatterns(filters: {
    query?: string;
    project?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<ErrorPattern[]> {
    let sql = `
      SELECT * FROM error_patterns
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.project) {
      params.push(filters.project);
      sql += ` AND project_name = $${params.length}`;
    }

    if (filters.category) {
      params.push(filters.category);
      sql += ` AND error_category = $${params.length}`;
    }

    if (filters.query) {
      params.push(`%${filters.query}%`);
      sql += ` AND error_message ILIKE $${params.length}`;
    }

    sql += ` ORDER BY occurrence_count DESC, last_seen DESC`;

    if (filters.limit) {
      params.push(filters.limit);
      sql += ` LIMIT $${params.length}`;
    }

    if (filters.offset) {
      params.push(filters.offset);
      sql += ` OFFSET $${params.length}`;
    }

    const result = await query<ErrorPattern>(sql, params);
    return result.rows;
  }

  /**
   * Get error patterns with solutions
   */
  async getErrorPatternsWithSolutions(limit: number = 20): Promise<any[]> {
    const result = await query(`
      SELECT * FROM v_error_patterns_with_solutions LIMIT $1
    `, [limit]);

    return result.rows;
  }

  /**
   * Create error solution
   */
  async createErrorSolution(input: CreateErrorSolutionInput): Promise<ErrorSolution> {
    const result = await query<ErrorSolution>(`
      INSERT INTO error_solutions (
        error_pattern_id,
        solution_title,
        solution_description,
        solution_steps,
        files_modified,
        code_snippets,
        reference_docs,
        related_commit_hash,
        work_log_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      input.error_pattern_id,
      input.solution_title,
      input.solution_description,
      input.solution_steps,
      input.files_modified || null,
      input.code_snippets ? JSON.stringify(input.code_snippets) : null,
      input.reference_docs || null,
      input.related_commit_hash || null,
      input.work_log_path || null
    ]);

    return result.rows[0];
  }

  /**
   * Get solutions for an error pattern
   */
  async getSolutionsByPatternId(patternId: number): Promise<ErrorSolution[]> {
    const result = await query<ErrorSolution>(`
      SELECT * FROM error_solutions
      WHERE error_pattern_id = $1
      ORDER BY success_rate DESC NULLS LAST, times_applied DESC
    `, [patternId]);

    return result.rows;
  }

  /**
   * Update solution usage
   */
  async updateSolutionUsage(solutionId: number, success: boolean, fixTimeMinutes?: number): Promise<void> {
    await query(`
      UPDATE error_solutions
      SET
        times_applied = times_applied + 1,
        success_rate = CASE
          WHEN success_rate IS NULL THEN ${success ? 100 : 0}
          ELSE (success_rate * times_applied + ${success ? 100 : 0}) / (times_applied + 1)
        END,
        average_fix_time_minutes = CASE
          WHEN $2::INTEGER IS NOT NULL THEN
            CASE
              WHEN average_fix_time_minutes IS NULL THEN $2
              ELSE (average_fix_time_minutes * times_applied + $2) / (times_applied + 1)
            END
          ELSE average_fix_time_minutes
        END
      WHERE id = $1
    `, [solutionId, fixTimeMinutes || null]);
  }

  /**
   * Create error occurrence
   */
  async createErrorOccurrence(input: CreateErrorOccurrenceInput): Promise<ErrorOccurrence> {
    const result = await query<ErrorOccurrence>(`
      INSERT INTO error_occurrences (
        error_pattern_id,
        environment,
        project_name,
        stack_trace,
        context_info,
        test_run_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      input.error_pattern_id,
      input.environment,
      input.project_name,
      input.stack_trace || null,
      input.context_info ? JSON.stringify(input.context_info) : null,
      input.test_run_id || null
    ]);

    return result.rows[0];
  }

  /**
   * Mark error occurrence as resolved
   */
  async resolveErrorOccurrence(
    occurrenceId: number,
    solutionId: number,
    resolutionTimeMinutes: number
  ): Promise<void> {
    await query(`
      UPDATE error_occurrences
      SET
        resolved = TRUE,
        resolved_at = NOW(),
        solution_applied_id = $2,
        resolution_time_minutes = $3
      WHERE id = $1
    `, [occurrenceId, solutionId, resolutionTimeMinutes]);
  }

  /**
   * Get recent unresolved errors
   */
  async getRecentUnresolvedErrors(limit: number = 50): Promise<any[]> {
    const result = await query(`
      SELECT * FROM v_recent_unresolved_errors LIMIT $1
    `, [limit]);

    return result.rows;
  }

  /**
   * Get error pattern statistics
   */
  async getErrorPatternStats(projectName?: string): Promise<{
    total_patterns: number;
    total_occurrences: number;
    patterns_with_solutions: number;
    avg_occurrence_count: number;
  }> {
    let sql = `
      SELECT
        COUNT(*) as total_patterns,
        SUM(occurrence_count) as total_occurrences,
        SUM(CASE WHEN scenario_generated = TRUE THEN 1 ELSE 0 END) as patterns_with_solutions,
        ROUND(AVG(occurrence_count), 2) as avg_occurrence_count
      FROM error_patterns
    `;

    const params: any[] = [];
    if (projectName) {
      params.push(projectName);
      sql += ` WHERE project_name = $1`;
    }

    const result = await query(sql, params);

    return result.rows[0] || {
      total_patterns: 0,
      total_occurrences: 0,
      patterns_with_solutions: 0,
      avg_occurrence_count: 0
    };
  }
}

export default new ErrorPatternRepository();
