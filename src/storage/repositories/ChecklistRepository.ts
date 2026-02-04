/**
 * Checklist Repository
 * Database operations for debugging checklists and items
 */

import { query, getClient } from '../db.js';
import { PoolClient } from 'pg';
import {
  DebuggingChecklist,
  ChecklistItem,
  ChecklistWithItems,
  ChecklistSummary,
  CreateChecklistInput,
  CreateChecklistItemInput,
  UpdateChecklistInput,
  UpdateChecklistItemInput,
  ChecklistFilters,
  ChecklistCategory
} from '../models/Checklist.js';

export class ChecklistRepository {
  /**
   * Get all checklists with summary (item counts)
   */
  async getChecklistsSummary(filters: ChecklistFilters = {}): Promise<ChecklistSummary[]> {
    let sql = `
      SELECT * FROM v_checklists_summary
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.category) {
      params.push(filters.category);
      sql += ` AND category = $${params.length}`;
    }

    if (filters.scope) {
      params.push(filters.scope);
      sql += ` AND (scope = $${params.length} OR scope = 'both')`;
    }

    if (filters.project) {
      params.push(filters.project);
      sql += ` AND $${params.length} = ANY(applicable_projects)`;
    }

    if (filters.query) {
      params.push(`%${filters.query}%`);
      sql += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    if (filters.is_active !== undefined) {
      params.push(filters.is_active);
      sql += ` AND is_active = $${params.length}`;
    }

    sql += ` ORDER BY priority DESC, category, title`;

    if (filters.limit) {
      params.push(filters.limit);
      sql += ` LIMIT $${params.length}`;
    }

    if (filters.offset) {
      params.push(filters.offset);
      sql += ` OFFSET $${params.length}`;
    }

    const result = await query<ChecklistSummary>(sql, params);
    return result.rows;
  }

  /**
   * Get checklist by ID
   */
  async getChecklistById(id: number): Promise<DebuggingChecklist | null> {
    const result = await query<DebuggingChecklist>(`
      SELECT * FROM debugging_checklists WHERE id = $1
    `, [id]);

    return result.rows[0] || null;
  }

  /**
   * Get checklist with all items
   */
  async getChecklistWithItems(id: number): Promise<ChecklistWithItems | null> {
    const checklist = await this.getChecklistById(id);
    if (!checklist) {
      return null;
    }

    const itemsResult = await query<ChecklistItem>(`
      SELECT * FROM checklist_items
      WHERE checklist_id = $1
      ORDER BY item_order ASC
    `, [id]);

    return {
      ...checklist,
      items: itemsResult.rows
    };
  }

  /**
   * Get checklists by category with items
   */
  async getChecklistsByCategory(category: ChecklistCategory): Promise<ChecklistWithItems[]> {
    const checklistsResult = await query<DebuggingChecklist>(`
      SELECT * FROM debugging_checklists
      WHERE category = $1 AND is_active = TRUE
      ORDER BY priority DESC, title
    `, [category]);

    const result: ChecklistWithItems[] = [];

    for (const checklist of checklistsResult.rows) {
      const itemsResult = await query<ChecklistItem>(`
        SELECT * FROM checklist_items
        WHERE checklist_id = $1
        ORDER BY item_order ASC
      `, [checklist.id]);

      result.push({
        ...checklist,
        items: itemsResult.rows
      });
    }

    return result;
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<{ category: ChecklistCategory; count: number }[]> {
    const result = await query<{ category: ChecklistCategory; count: number }>(`
      SELECT category, COUNT(*) as count
      FROM debugging_checklists
      WHERE is_active = TRUE
      GROUP BY category
      ORDER BY count DESC
    `);

    return result.rows;
  }

  /**
   * Create a new checklist
   */
  async createChecklist(input: CreateChecklistInput): Promise<DebuggingChecklist> {
    const result = await query<DebuggingChecklist>(`
      INSERT INTO debugging_checklists (
        category,
        title,
        description,
        scope,
        applicable_projects,
        priority,
        version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      input.category,
      input.title,
      input.description || null,
      input.scope || 'both',
      input.applicable_projects || null,
      input.priority || 0,
      input.version || '1.0'
    ]);

    return result.rows[0];
  }

  /**
   * Update a checklist
   */
  async updateChecklist(id: number, input: UpdateChecklistInput): Promise<DebuggingChecklist | null> {
    const fields: string[] = [];
    const params: any[] = [id];

    if (input.category !== undefined) {
      params.push(input.category);
      fields.push(`category = $${params.length}`);
    }
    if (input.title !== undefined) {
      params.push(input.title);
      fields.push(`title = $${params.length}`);
    }
    if (input.description !== undefined) {
      params.push(input.description);
      fields.push(`description = $${params.length}`);
    }
    if (input.scope !== undefined) {
      params.push(input.scope);
      fields.push(`scope = $${params.length}`);
    }
    if (input.applicable_projects !== undefined) {
      params.push(input.applicable_projects);
      fields.push(`applicable_projects = $${params.length}`);
    }
    if (input.priority !== undefined) {
      params.push(input.priority);
      fields.push(`priority = $${params.length}`);
    }
    if (input.version !== undefined) {
      params.push(input.version);
      fields.push(`version = $${params.length}`);
    }
    if (input.is_active !== undefined) {
      params.push(input.is_active);
      fields.push(`is_active = $${params.length}`);
    }

    if (fields.length === 0) {
      return this.getChecklistById(id);
    }

    const result = await query<DebuggingChecklist>(`
      UPDATE debugging_checklists
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `, params);

    return result.rows[0] || null;
  }

  /**
   * Delete a checklist (soft delete - set is_active = false)
   */
  async deleteChecklist(id: number, hardDelete: boolean = false): Promise<boolean> {
    if (hardDelete) {
      const result = await query(`
        DELETE FROM debugging_checklists WHERE id = $1
      `, [id]);
      return (result.rowCount ?? 0) > 0;
    } else {
      const result = await query(`
        UPDATE debugging_checklists SET is_active = FALSE WHERE id = $1
      `, [id]);
      return (result.rowCount ?? 0) > 0;
    }
  }

  /**
   * Create a checklist item
   */
  async createChecklistItem(input: CreateChecklistItemInput): Promise<ChecklistItem> {
    const result = await query<ChecklistItem>(`
      INSERT INTO checklist_items (
        checklist_id,
        item_order,
        title,
        description,
        severity,
        code_example,
        anti_pattern,
        related_error_pattern_ids,
        reference_docs,
        keywords
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      input.checklist_id,
      input.item_order,
      input.title,
      input.description || null,
      input.severity || 'medium',
      input.code_example || null,
      input.anti_pattern || null,
      input.related_error_pattern_ids || null,
      input.reference_docs || null,
      input.keywords || null
    ]);

    return result.rows[0];
  }

  /**
   * Update a checklist item
   */
  async updateChecklistItem(itemId: number, input: UpdateChecklistItemInput): Promise<ChecklistItem | null> {
    const fields: string[] = [];
    const params: any[] = [itemId];

    if (input.item_order !== undefined) {
      params.push(input.item_order);
      fields.push(`item_order = $${params.length}`);
    }
    if (input.title !== undefined) {
      params.push(input.title);
      fields.push(`title = $${params.length}`);
    }
    if (input.description !== undefined) {
      params.push(input.description);
      fields.push(`description = $${params.length}`);
    }
    if (input.severity !== undefined) {
      params.push(input.severity);
      fields.push(`severity = $${params.length}`);
    }
    if (input.code_example !== undefined) {
      params.push(input.code_example);
      fields.push(`code_example = $${params.length}`);
    }
    if (input.anti_pattern !== undefined) {
      params.push(input.anti_pattern);
      fields.push(`anti_pattern = $${params.length}`);
    }
    if (input.related_error_pattern_ids !== undefined) {
      params.push(input.related_error_pattern_ids);
      fields.push(`related_error_pattern_ids = $${params.length}`);
    }
    if (input.reference_docs !== undefined) {
      params.push(input.reference_docs);
      fields.push(`reference_docs = $${params.length}`);
    }
    if (input.keywords !== undefined) {
      params.push(input.keywords);
      fields.push(`keywords = $${params.length}`);
    }

    if (fields.length === 0) {
      const result = await query<ChecklistItem>(`
        SELECT * FROM checklist_items WHERE id = $1
      `, [itemId]);
      return result.rows[0] || null;
    }

    const result = await query<ChecklistItem>(`
      UPDATE checklist_items
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `, params);

    return result.rows[0] || null;
  }

  /**
   * Delete a checklist item
   */
  async deleteChecklistItem(itemId: number): Promise<boolean> {
    const result = await query(`
      DELETE FROM checklist_items WHERE id = $1
    `, [itemId]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Search checklist items by keyword
   */
  async searchItemsByKeyword(keyword: string, limit: number = 20): Promise<(ChecklistItem & { checklist_title: string; checklist_category: string })[]> {
    const result = await query<ChecklistItem & { checklist_title: string; checklist_category: string }>(`
      SELECT ci.*, dc.title as checklist_title, dc.category as checklist_category
      FROM checklist_items ci
      JOIN debugging_checklists dc ON ci.checklist_id = dc.id
      WHERE dc.is_active = TRUE
        AND (
          $1 = ANY(ci.keywords)
          OR ci.title ILIKE $2
          OR ci.description ILIKE $2
        )
      ORDER BY ci.severity DESC, ci.item_order
      LIMIT $3
    `, [keyword.toLowerCase(), `%${keyword}%`, limit]);

    return result.rows;
  }

  /**
   * Get items linked to specific error pattern
   */
  async getItemsByErrorPatternId(errorPatternId: number): Promise<(ChecklistItem & { checklist_title: string; checklist_category: string })[]> {
    const result = await query<ChecklistItem & { checklist_title: string; checklist_category: string }>(`
      SELECT ci.*, dc.title as checklist_title, dc.category as checklist_category
      FROM checklist_items ci
      JOIN debugging_checklists dc ON ci.checklist_id = dc.id
      WHERE dc.is_active = TRUE
        AND $1 = ANY(ci.related_error_pattern_ids)
      ORDER BY dc.priority DESC, ci.item_order
    `, [errorPatternId]);

    return result.rows;
  }

  /**
   * Get checklist statistics
   */
  async getChecklistStats(): Promise<{
    total_checklists: number;
    total_items: number;
    by_category: Record<string, number>;
    by_severity: Record<string, number>;
  }> {
    const totalResult = await query(`
      SELECT
        (SELECT COUNT(*) FROM debugging_checklists WHERE is_active = TRUE) as total_checklists,
        (SELECT COUNT(*) FROM checklist_items ci JOIN debugging_checklists dc ON ci.checklist_id = dc.id WHERE dc.is_active = TRUE) as total_items
    `);

    const categoryResult = await query<{ category: string; count: number }>(`
      SELECT category, COUNT(*) as count
      FROM debugging_checklists
      WHERE is_active = TRUE
      GROUP BY category
    `);

    const severityResult = await query<{ severity: string; count: number }>(`
      SELECT ci.severity, COUNT(*) as count
      FROM checklist_items ci
      JOIN debugging_checklists dc ON ci.checklist_id = dc.id
      WHERE dc.is_active = TRUE
      GROUP BY ci.severity
    `);

    const byCategory: Record<string, number> = {};
    categoryResult.rows.forEach(row => {
      byCategory[row.category] = Number(row.count);
    });

    const bySeverity: Record<string, number> = {};
    severityResult.rows.forEach(row => {
      bySeverity[row.severity] = Number(row.count);
    });

    return {
      total_checklists: Number(totalResult.rows[0]?.total_checklists || 0),
      total_items: Number(totalResult.rows[0]?.total_items || 0),
      by_category: byCategory,
      by_severity: bySeverity
    };
  }
}

export default new ChecklistRepository();
