/**
 * Error Search Service
 * Search and retrieve error patterns with solutions
 */

import ErrorPatternRepository from '../storage/repositories/ErrorPatternRepository.js';

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
  }) {
    // Upsert error pattern
    const pattern = await ErrorPatternRepository.upsertErrorPattern({
      project_name: input.project_name,
      error_hash: input.error_hash,
      error_message: input.error_message,
      error_category: input.error_category as any
    });

    // Create error occurrence
    const occurrence = await ErrorPatternRepository.createErrorOccurrence({
      error_pattern_id: pattern.id,
      environment: input.environment,
      project_name: input.project_name,
      stack_trace: input.stack_trace,
      context_info: input.context_info,
      test_run_id: input.test_run_id
    });

    // Get similar patterns (for suggestions)
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

  /**
   * Get error pattern statistics
   */
  async getErrorPatternStats(projectName?: string) {
    return await ErrorPatternRepository.getErrorPatternStats(projectName);
  }
}

export default new ErrorSearchService();
