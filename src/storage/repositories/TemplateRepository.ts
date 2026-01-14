/**
 * Template Repository
 * Database operations for test script templates
 */

import { query } from '../db.js';
import {
  TestScriptTemplate,
  TemplateType,
  CreateTestScriptTemplateInput,
  UpdateTestScriptTemplateInput
} from '../models/TestScriptTemplate.js';

export class TemplateRepository {
  /**
   * Create a new template
   */
  async createTemplate(input: CreateTestScriptTemplateInput): Promise<TestScriptTemplate> {
    const result = await query<TestScriptTemplate>(`
      INSERT INTO test_script_templates (
        template_name,
        template_type,
        description,
        script_content,
        variables,
        applicable_projects,
        applicable_environments,
        tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      input.template_name,
      input.template_type,
      input.description || null,
      input.script_content,
      JSON.stringify(input.variables),
      input.applicable_projects || null,
      input.applicable_environments || null,
      input.tags || null
    ]);

    return result.rows[0];
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: number): Promise<TestScriptTemplate | null> {
    const result = await query<TestScriptTemplate>(`
      SELECT * FROM test_script_templates WHERE id = $1
    `, [id]);

    return result.rows[0] || null;
  }

  /**
   * Search templates by type or tags
   */
  async searchTemplates(filters: {
    type?: TemplateType;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<TestScriptTemplate[]> {
    let sql = `
      SELECT * FROM test_script_templates
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.type) {
      params.push(filters.type);
      sql += ` AND template_type = $${params.length}`;
    }

    if (filters.tags && filters.tags.length > 0) {
      params.push(filters.tags);
      sql += ` AND tags && $${params.length}`;
    }

    sql += ` ORDER BY times_used DESC, success_rate DESC NULLS LAST`;

    if (filters.limit) {
      params.push(filters.limit);
      sql += ` LIMIT $${params.length}`;
    }

    if (filters.offset) {
      params.push(filters.offset);
      sql += ` OFFSET $${params.length}`;
    }

    const result = await query<TestScriptTemplate>(sql, params);
    return result.rows;
  }

  /**
   * Update template usage statistics
   */
  async updateTemplateUsage(templateId: number, success: boolean, executionTimeSeconds?: number): Promise<void> {
    await query(`
      UPDATE test_script_templates
      SET
        times_used = times_used + 1,
        success_rate = CASE
          WHEN success_rate IS NULL THEN ${success ? 100 : 0}
          ELSE (success_rate * times_used + ${success ? 100 : 0}) / (times_used + 1)
        END,
        average_execution_time_seconds = CASE
          WHEN $2::INTEGER IS NOT NULL THEN
            CASE
              WHEN average_execution_time_seconds IS NULL THEN $2
              ELSE (average_execution_time_seconds * times_used + $2) / (times_used + 1)
            END
          ELSE average_execution_time_seconds
        END
      WHERE id = $1
    `, [templateId, executionTimeSeconds || null]);
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsageStats(): Promise<any[]> {
    const result = await query(`
      SELECT * FROM v_template_usage_stats
    `);

    return result.rows;
  }

  /**
   * Update template
   */
  async updateTemplate(id: number, input: UpdateTestScriptTemplateInput): Promise<TestScriptTemplate | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.template_name !== undefined) {
      fields.push(`template_name = $${paramIndex++}`);
      values.push(input.template_name);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.script_content !== undefined) {
      fields.push(`script_content = $${paramIndex++}`);
      values.push(input.script_content);
    }
    if (input.variables !== undefined) {
      fields.push(`variables = $${paramIndex++}`);
      values.push(JSON.stringify(input.variables));
    }
    if (input.applicable_projects !== undefined) {
      fields.push(`applicable_projects = $${paramIndex++}`);
      values.push(input.applicable_projects);
    }
    if (input.applicable_environments !== undefined) {
      fields.push(`applicable_environments = $${paramIndex++}`);
      values.push(input.applicable_environments);
    }
    if (input.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(input.tags);
    }

    if (fields.length === 0) {
      return null;
    }

    values.push(id);

    const result = await query<TestScriptTemplate>(`
      UPDATE test_script_templates
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: number): Promise<boolean> {
    const result = await query(`
      DELETE FROM test_script_templates WHERE id = $1
    `, [id]);

    return (result.rowCount ?? 0) > 0;
  }
}

export default new TemplateRepository();
