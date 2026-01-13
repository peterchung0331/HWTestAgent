/**
 * API Routes
 * Main API endpoints for test execution and results
 */

import express, { Router, Request, Response } from 'express';
import { TestRunner } from '../../runner/TestRunner.js';
import { Environment, TriggerSource } from '../../storage/models/TestRun.js';
import TestRepository from '../../storage/repositories/TestRepository.js';
import SlackNotifier from '../../notification/SlackNotifier.js';
import { authenticateApiKey } from '../middleware/auth.js';

const router: Router = express.Router();
const testRunner = new TestRunner();

/**
 * POST /api/test/run
 * Run a test scenario
 */
router.post('/test/run', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const {
      project,
      scenario,
      environment = 'production',
      auto_fix = true,
      max_retry = 3,
      triggered_by = 'manual',
      stop_on_failure = false
    } = req.body;

    // Validation
    if (!project || !scenario) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: project, scenario'
      });
      return;
    }

    console.log(`\n📨 Received test run request:`);
    console.log(`   Project: ${project}`);
    console.log(`   Scenario: ${scenario}`);
    console.log(`   Environment: ${environment}`);
    console.log(`   Auto-fix: ${auto_fix}`);
    console.log(`   Triggered by: ${triggered_by}\n`);

    // Run test (async, don't wait)
    const runPromise = testRunner.run({
      project,
      scenario,
      environment: environment as Environment,
      auto_fix,
      max_retry,
      triggered_by: triggered_by as TriggerSource,
      stop_on_failure
    });

    // Return immediately with test run ID
    runPromise.then(async (result) => {
      // Send Slack notification
      if (SlackNotifier.isEnabled()) {
        const testRunWithSteps = await TestRepository.getTestRunWithSteps(result.test_run_id);

        if (testRunWithSteps) {
          const failed_steps_details = testRunWithSteps.steps
            .filter(step => step.status === 'FAILED')
            .map(step => ({
              name: step.name,
              error_message: step.error_message || 'Unknown error'
            }));

          await SlackNotifier.sendTestRunNotification({
            project_name: project,
            scenario_slug: scenario,
            scenario_name: scenario, // TODO: Get from scenario file
            status: result.status as 'PASSED' | 'FAILED',
            total_steps: result.total_steps,
            passed_steps: result.passed_steps,
            failed_steps: result.failed_steps,
            auto_fixed_count: result.auto_fixed_count,
            retry_count: result.retry_count,
            duration_ms: result.duration_ms,
            started_at: testRunWithSteps.run.started_at,
            dashboard_url: process.env.DASHBOARD_URL
              ? `${process.env.DASHBOARD_URL}/results/${result.test_run_id}`
              : undefined,
            failed_steps_details
          });
        }
      }
    }).catch(error => {
      console.error('❌ Test run error:', error);

      if (SlackNotifier.isEnabled()) {
        SlackNotifier.sendSimpleNotification(
          `❌ Test run failed for ${project}/${scenario}: ${error.message}`
        );
      }
    });

    res.json({
      success: true,
      message: 'Test run started',
      data: {
        status: 'RUNNING'
      }
    });

  } catch (error) {
    console.error('❌ API error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/test/results
 * Get recent test results
 */
router.get('/test/results', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const project = req.query.project as string | undefined;

    const results = await TestRepository.getRecentTestRuns(limit, project);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('❌ API error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/test/results/:id
 * Get detailed test result
 */
router.get('/test/results/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid test run ID'
      });
      return;
    }

    const result = await TestRepository.getTestRunWithSteps(id);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Test run not found'
      });
      return;
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ API error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/test/stats/:project
 * Get test statistics for a project
 */
router.get('/test/stats/:project', async (req: Request, res: Response) => {
  try {
    const project = req.params.project;
    const days = parseInt(req.query.days as string) || 30;

    const stats = await TestRepository.getTestStatistics(project, days);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ API error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/error-patterns
 * Get error patterns with filters
 */
router.get('/error-patterns', async (req: Request, res: Response) => {
  try {
    const { project, category, query, limit, offset } = req.query;

    const ErrorPatternRepository = (await import('../../storage/repositories/ErrorPatternRepository.js')).default;

    const patterns = await ErrorPatternRepository.searchErrorPatterns({
      project: project as string,
      category: category as string,
      query: query as string,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0
    });

    res.json({
      success: true,
      data: patterns
    });
  } catch (error) {
    console.error('❌ API error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/error-patterns/:id
 * Get error pattern by ID with solutions
 */
router.get('/error-patterns/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ErrorSearchService = (await import('../../services/errorSearch.service.js')).default;

    const result = await ErrorSearchService.getErrorPatternWithSolutions(parseInt(id));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ API error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/error-patterns/record
 * Record error occurrence
 */
router.post('/error-patterns/record', async (req: Request, res: Response) => {
  try {
    const ErrorSearchService = (await import('../../services/errorSearch.service.js')).default;

    const result = await ErrorSearchService.recordErrorOccurrence(req.body);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ API error:', error);
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
    const { project } = req.query;

    const ErrorSearchService = (await import('../../services/errorSearch.service.js')).default;

    const stats = await ErrorSearchService.getErrorPatternStats(project as string);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ API error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/templates
 * Get test script templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { type, tags } = req.query;

    const TemplateRepository = (await import('../../storage/repositories/TemplateRepository.js')).default;

    const templates = await TemplateRepository.searchTemplates({
      type: type as any,
      tags: tags ? (Array.isArray(tags) ? tags as string[] : [tags as string]) : undefined,
      limit: 100
    });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('❌ API error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/templates/:id
 * Get template by ID
 */
router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const TemplateRepository = (await import('../../storage/repositories/TemplateRepository.js')).default;

    const template = await TemplateRepository.getTemplateById(parseInt(id));

    if (!template) {
      res.status(404).json({
        success: false,
        error: 'Template not found'
      });
      return;
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('❌ API error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/templates/:id/generate
 * Generate script from template
 */
router.post('/templates/:id/generate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    const TemplateEngineService = (await import('../../services/templateEngine.service.js')).default;

    const result = await TemplateEngineService.generateScript({
      template_id: parseInt(id),
      variables
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ API error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

export default router;
