/**
 * Test Runner
 * Main test execution engine with auto-fix support
 */

import { HttpAdapter, HttpTestStep, HttpTestResult } from './adapters/HttpAdapter.js';
import { RenoAdapter, RenoTestStep, RenoTestStepResult } from './adapters/RenoAdapter.js';
import { ScenarioLoader, Scenario, TestStep } from './scenarios/ScenarioLoader.js';
import TestRepository from '../storage/repositories/TestRepository.js';
import { TestRun, Environment, TriggerSource, TestRunStatus } from '../storage/models/TestRun.js';
import { TestStep as TestStepModel } from '../storage/models/TestStep.js';

export interface RunOptions {
  project: string;
  scenario: string;
  environment: Environment;
  triggered_by: TriggerSource;
  auto_fix?: boolean;
  max_retry?: number;
  stop_on_failure?: boolean;
}

// 통합 테스트 결과 타입
export type StepResult = HttpTestResult | RenoTestStepResult;

export interface TestRunResult {
  test_run_id: number;
  status: TestRunStatus;
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  auto_fixed_count: number;
  retry_count: number;
  duration_ms: number;
  steps: StepResult[];
}

export class TestRunner {
  private scenarioLoader: ScenarioLoader;
  private httpAdapter: HttpAdapter;
  private renoAdapter: RenoAdapter | null = null;
  private autoFixer: any; // Will be implemented later

  constructor() {
    this.scenarioLoader = new ScenarioLoader();
    this.httpAdapter = new HttpAdapter();
  }

  /**
   * Initialize Reno adapter for RENO_AI scenarios
   */
  private initRenoAdapter(scenario: Scenario): void {
    const baseUrl = scenario.reno_config?.base_url
      || process.env.WBSALESHUB_URL
      || 'http://localhost:4010';

    this.renoAdapter = new RenoAdapter({
      baseUrl,
      verbose: process.env.VERBOSE === 'true'
    });
  }

  /**
   * Execute a single test step based on type
   */
  private async executeStep(step: TestStep, scenario: Scenario): Promise<StepResult> {
    if (step.type === 'reno') {
      if (!this.renoAdapter) {
        this.initRenoAdapter(scenario);
      }
      return this.renoAdapter!.executeStep(step as RenoTestStep);
    }

    return this.httpAdapter.executeStep(step as HttpTestStep);
  }

  /**
   * Run a test scenario
   */
  async run(options: RunOptions): Promise<TestRunResult> {
    console.log('\n🚀 ===== WorkHub Probe Test Run =====\n');
    console.log(`📦 Project: ${options.project}`);
    console.log(`🎯 Scenario: ${options.scenario}`);
    console.log(`🌍 Environment: ${options.environment}`);
    console.log(`🔧 Auto-fix: ${options.auto_fix ?? true ? 'Enabled' : 'Disabled'}`);
    console.log(`🔄 Max retries: ${options.max_retry ?? 3}\n`);

    const started_at = new Date();

    try {
      // Load scenario
      const scenario = this.scenarioLoader.loadScenario(options.project, options.scenario);
      console.log(`✅ Scenario loaded: ${scenario.name}`);
      console.log(`   Steps: ${scenario.steps.length}\n`);

      // Initialize variables
      this.initializeVariables(scenario.variables);

      // Create test run record
      const testRun = await TestRepository.createTestRun({
        project_name: options.project,
        scenario_slug: options.scenario,
        environment: options.environment,
        triggered_by: options.triggered_by,
        total_steps: scenario.steps.length,
        auto_fix_enabled: options.auto_fix ?? true
      });

      console.log(`📝 Test run created: ID=${testRun.id}\n`);

      // Execute steps
      const results: StepResult[] = [];
      let passed_steps = 0;
      let failed_steps = 0;
      let auto_fixed_count = 0;
      let retry_count = 0;

      for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📍 Step ${i + 1}/${scenario.steps.length}: ${step.name}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        let stepResult = await this.executeStep(step, scenario);

        // Auto-fix if failed
        if (stepResult.status === 'FAILED' && (options.auto_fix ?? true)) {
          const maxRetry = options.max_retry ?? 3;

          for (let attempt = 1; attempt <= maxRetry; attempt++) {
            if (stepResult.status !== 'FAILED') break;

            console.log(`\n🔧 Auto-fix attempt ${attempt}/${maxRetry}...`);

            // TODO: Call AutoFixer here
            // For now, we'll just retry once
            await this.wait(2000); // Wait 2 seconds before retry

            stepResult = await this.executeStep(step, scenario);
            retry_count++;

            if (stepResult.status !== 'FAILED') {
              auto_fixed_count++;
              console.log(`✅ Auto-fix successful!`);
              break;
            }
          }
        }

        // Save step result
        const savedStep = await TestRepository.createTestStep({
          test_run_id: testRun.id,
          name: step.name,
          step_order: i + 1,
          status: stepResult.status,
          started_at: stepResult.started_at,
          finished_at: stepResult.finished_at,
          duration_ms: stepResult.duration_ms,
          error_message: stepResult.error_message,
          response_data: stepResult.response_data,
          auto_fixed: auto_fixed_count > 0 && stepResult.status === 'PASSED',
          retry_attempt: retry_count
        });

        // Save Reno test details if this is a Reno step
        if (step.type === 'reno' && (stepResult as RenoTestStepResult).response_data?.results) {
          const renoResult = stepResult as RenoTestStepResult;
          await TestRepository.createRenoTestDetailsFromReport(
            savedStep.id,
            renoResult.response_data!.results
          );
          console.log(`   📊 Saved ${renoResult.response_data!.results.length} Reno test details`);
        }

        results.push(stepResult);

        if (stepResult.status === 'PASSED') {
          passed_steps++;
        } else if (stepResult.status === 'FAILED') {
          failed_steps++;

          if (options.stop_on_failure) {
            console.log('\n⚠️  Stopping test run due to failure');
            break;
          }
        }
      }

      const finished_at = new Date();
      const duration_ms = finished_at.getTime() - started_at.getTime();

      // Determine final status
      const finalStatus: TestRunStatus = failed_steps === 0 ? 'PASSED' : 'FAILED';

      // Update test run
      await TestRepository.updateTestRun(testRun.id, {
        status: finalStatus,
        finished_at,
        duration_ms,
        passed_steps,
        failed_steps,
        auto_fixed_count,
        retry_count
      });

      console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Test Run Summary');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Status: ${finalStatus === 'PASSED' ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Total Steps: ${scenario.steps.length}`);
      console.log(`Passed: ${passed_steps}`);
      console.log(`Failed: ${failed_steps}`);
      console.log(`Auto-fixed: ${auto_fixed_count}`);
      console.log(`Retries: ${retry_count}`);
      console.log(`Duration: ${(duration_ms / 1000).toFixed(2)}s`);
      console.log(`Success Rate: ${((passed_steps / scenario.steps.length) * 100).toFixed(1)}%`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return {
        test_run_id: testRun.id,
        status: finalStatus,
        total_steps: scenario.steps.length,
        passed_steps,
        failed_steps,
        auto_fixed_count,
        retry_count,
        duration_ms,
        steps: results
      };

    } catch (error) {
      console.error('\n❌ Test run failed:', error);
      throw error;
    }
  }

  /**
   * Initialize scenario variables
   */
  private initializeVariables(variables: Record<string, string>): void {
    console.log('🔧 Initializing variables...');

    for (const [key, value] of Object.entries(variables)) {
      this.httpAdapter.setSavedVariable(key, value);
      console.log(`   ${key} = ${value}`);
    }

    console.log('');
  }

  /**
   * Wait for specified milliseconds
   */
  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TestRunner;
