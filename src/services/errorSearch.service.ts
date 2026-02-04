/**
 * Error Search Service
 * Search and retrieve error patterns with solutions
 */

import ErrorPatternRepository from '../storage/repositories/ErrorPatternRepository.js';
import BackgroundQueueService from './backgroundQueue.service.js';
import { getClient } from '../storage/db.js';

export class ErrorSearchService {
  /**
   * Search error patterns
   */
  async searchErrorPatterns(filters: {
    query?: string;
    project?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }) {
    return await ErrorPatternRepository.searchErrorPatterns(filters);
  }

  /**
   * Get error pattern with solutions
   */
  async getErrorPatternWithSolutions(patternId: number) {
    const pattern = await ErrorPatternRepository.getErrorPatternById(patternId);
    if (!pattern) {
      throw new Error(`Error pattern not found: ${patternId}`);
    }

    const solutions = await ErrorPatternRepository.getSolutionsByPatternId(patternId);

    return {
      pattern,
      solutions
    };
  }

  /**
   * Record error occurrence
   */
  async recordErrorOccurrence(input: {
    error_message: string;
    error_hash: string;
    project_name: string;
    environment: string;
    error_category?: string;
    stack_trace?: string;
    context_info?: Record<string, any>;
    test_run_id?: number;
    async_mode?: boolean; // Default: true
    include_similar?: boolean; // Default: false
  }) {
    const asyncMode = input.async_mode !== false; // Default true
    const includeSimilar = input.include_similar || false;

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Upsert error pattern (with transaction)
      const pattern = await ErrorPatternRepository.upsertErrorPattern({
        project_name: input.project_name,
        error_hash: input.error_hash,
        error_message: input.error_message,
        error_category: input.error_category as any
      }, client);

      // Create error occurrence (with transaction)
      const occurrence = await ErrorPatternRepository.createErrorOccurrence({
        error_pattern_id: pattern.id,
        environment: input.environment,
        project_name: input.project_name,
        stack_trace: input.stack_trace,
        context_info: input.context_info,
        test_run_id: input.test_run_id
      }, client);

      await client.query('COMMIT');

      // Handle similar pattern search
      if (includeSimilar) {
        if (asyncMode) {
          // Async mode: Add to background queue
          await BackgroundQueueService.addTask({
            type: 'SEARCH_SIMILAR_PATTERNS',
            data: {
              patternId: pattern.id,
              projectName: input.project_name,
              errorMessage: input.error_message
            }
          });

          return {
            occurrence,
            pattern,
            similar_patterns: [] // Empty in async mode
          };
        } else {
          // Sync mode: Search immediately
          const similarPatterns = await this.searchErrorPatterns({
            query: input.error_message.substring(0, 100),
            project: input.project_name,
            limit: 5
          });

          return {
            occurrence,
            pattern,
            similar_patterns: similarPatterns.filter(p => p.id !== pattern.id)
          };
        }
      }

      return {
        occurrence,
        pattern,
        similar_patterns: []
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get error pattern statistics
   */
  async getErrorPatternStats(projectName?: string) {
    return await ErrorPatternRepository.getErrorPatternStats(projectName);
  }
}

export default new ErrorSearchService();
