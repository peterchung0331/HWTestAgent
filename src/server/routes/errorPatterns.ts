/**
 * Error Pattern API Routes
 * Handles error pattern recording, searching, and solution retrieval
 */

import express, { Router, Request, Response } from 'express';
import ErrorPatternRepository from '../../storage/repositories/ErrorPatternRepository.js';
import { authenticateApiKey } from '../middleware/auth.js';
import { ErrorCategory } from '../../storage/models/ErrorPattern.js';

const router: Router = express.Router();

/**
 * POST /api/error-patterns/record
 * Record a new error pattern or increment occurrence count
 */
router.post('/error-patterns/record', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const {
      project_name,
      error_message,
      error_hash,
      error_category = 'UNKNOWN',
      status_code,
      method,
      endpoint,
      environment = 'local',
      stack_trace,
      context_info,
      test_run_id
    } = req.body;

    // Validation
    if (!project_name || !error_message || !error_hash) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: project_name, error_message, error_hash'
      });
      return;
    }

    console.log(`\n📨 Recording error pattern:`);
    console.log(`   Project: ${project_name}`);
    console.log(`   Category: ${error_category}`);
    console.log(`   Message: ${error_message.substring(0, 100)}...`);
    console.log(`   Environment: ${environment}\n`);

    // Upsert error pattern
    const errorPattern = await ErrorPatternRepository.upsertErrorPattern({
      project_name,
      error_message,
      error_hash,
      error_category: error_category as ErrorCategory,
      status_code,
      method,
      endpoint,
      confidence: 1.0
    });

    // Create error occurrence
    const errorOccurrence = await ErrorPatternRepository.createErrorOccurrence({
      error_pattern_id: errorPattern.id,
      environment,
      project_name,
      stack_trace,
      context_info,
      test_run_id
    });

    // Search for similar patterns (for auto-solution suggestion)
    const similarPatterns = await ErrorPatternRepository.searchErrorPatterns({
      query: error_message,
      project: project_name,
      limit: 3
    });

    // Filter out the current pattern
    const filteredSimilar = similarPatterns.filter(p => p.id !== errorPattern.id);

    console.log(`✅ Error pattern recorded (ID: ${errorPattern.id}, Occurrences: ${errorPattern.occurrence_count})`);
    if (filteredSimilar.length > 0) {
      console.log(`💡 Found ${filteredSimilar.length} similar patterns`);
    }

    res.json({
      success: true,
      data: {
        error_pattern_id: errorPattern.id,
        error_occurrence_id: errorOccurrence.id,
        occurrence_count: errorPattern.occurrence_count,
        similar_patterns: filteredSimilar.map(p => ({
          id: p.id,
          error_message: p.error_message,
          occurrence_count: p.occurrence_count,
          last_seen: p.last_seen
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error pattern record failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/error-patterns
 * Search error patterns by query
 */
router.get('/error-patterns', async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string | undefined;
    const project = req.query.project as string | undefined;
    const category = req.query.category as string | undefined;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`\n🔍 Searching error patterns:`);
    console.log(`   Query: ${query || 'all'}`);
    console.log(`   Project: ${project || 'all'}`);
    console.log(`   Category: ${category || 'all'}`);
    console.log(`   Limit: ${limit}\n`);

    const patterns = await ErrorPatternRepository.searchErrorPatterns({
      query,
      project,
      category,
      limit,
      offset
    });

    // Get solution count for each pattern
    const patternsWithSolutionCount = await Promise.all(
      patterns.map(async (pattern) => {
        const solutions = await ErrorPatternRepository.getSolutionsByPatternId(pattern.id);
        return {
          ...pattern,
          solutions_count: solutions.length
        };
      })
    );

    console.log(`✅ Found ${patterns.length} patterns`);

    res.json({
      success: true,
      data: patternsWithSolutionCount
    });

  } catch (error) {
    console.error('❌ Error pattern search failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/error-patterns/:id
 * Get error pattern details with solutions
 */
router.get('/error-patterns/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid error pattern ID'
      });
      return;
    }

    console.log(`\n🔍 Fetching error pattern ${id}...\n`);

    // Get pattern
    const pattern = await ErrorPatternRepository.getErrorPatternById(id);

    if (!pattern) {
      res.status(404).json({
        success: false,
        error: 'Error pattern not found'
      });
      return;
    }

    // Get solutions
    const solutions = await ErrorPatternRepository.getSolutionsByPatternId(id);

    console.log(`✅ Found pattern with ${solutions.length} solutions`);

    res.json({
      success: true,
      data: {
        pattern,
        solutions: solutions.map(s => ({
          id: s.id,
          solution_title: s.solution_title,
          solution_description: s.solution_description,
          solution_steps: s.solution_steps,
          files_modified: s.files_modified,
          code_snippets: s.code_snippets,
          success_rate: s.success_rate,
          average_fix_time_minutes: s.average_fix_time_minutes,
          times_applied: s.times_applied,
          reference_docs: s.reference_docs,
          related_commit_hash: s.related_commit_hash,
          work_log_path: s.work_log_path,
          created_at: s.created_at
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error pattern fetch failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/error-patterns/stats
 * Get error pattern statistics
 */
router.get('/error-patterns/stats', async (req: Request, res: Response) => {
  try {
    const project = req.query.project as string | undefined;

    console.log(`\n📊 Fetching error pattern stats for ${project || 'all projects'}...\n`);

    const stats = await ErrorPatternRepository.getErrorPatternStats(project);

    console.log(`✅ Stats retrieved`);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error pattern stats failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
