/**
 * Playwright Adapter
 * Runs Playwright tests in hub repositories and parses JSON reporter output
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, access } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface PlaywrightRunConfig {
  hubRepo: string;            // e.g., '/mnt/c/GitHub/WBHubManager'
  testPattern?: string;       // e.g., 'tests/e2e/admin/**'
  environment: string;
  projectName: string;
  timeout?: number;           // ms, default 120000
}

export interface PlaywrightStepResult {
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'TIMED_OUT';
  started_at: Date;
  finished_at: Date;
  duration_ms: number;
  error_message?: string;
  error_category?: string;
}

export interface PlaywrightRunResult {
  project_name: string;
  scenario_name: string;
  environment: string;
  status: 'PASSED' | 'FAILED' | 'MIXED';
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  skipped_steps: number;
  duration_ms: number;
  steps: PlaywrightStepResult[];
  raw_output?: string;
}

export class PlaywrightAdapter {

  async run(config: PlaywrightRunConfig): Promise<PlaywrightRunResult> {
    const started = Date.now();
    const jsonOutputPath = path.join(config.hubRepo, 'test-results', 'probe-results.json');

    // Verify repo exists
    try {
      await access(config.hubRepo);
    } catch {
      throw new Error(`Hub repo not found: ${config.hubRepo}`);
    }

    // Build playwright command
    const testArg = config.testPattern ? ` ${config.testPattern}` : '';
    const cmd = `npx playwright test${testArg} --reporter=json`;
    const timeout = config.timeout || 120_000;

    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    try {
      const result = await execAsync(cmd, {
        cwd: config.hubRepo,
        timeout,
        env: {
          ...process.env,
          PLAYWRIGHT_JSON_OUTPUT_NAME: jsonOutputPath,
          PROBE_PROJECT: config.projectName,
          NODE_ENV: config.environment,
        },
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error: any) {
      stdout = error.stdout || '';
      stderr = error.stderr || '';
      exitCode = error.code || 1;
    }

    // Parse JSON reporter output
    const steps = await this.parseJsonOutput(jsonOutputPath, stdout);
    const duration = Date.now() - started;

    const passed = steps.filter(s => s.status === 'PASSED').length;
    const failed = steps.filter(s => s.status === 'FAILED' || s.status === 'TIMED_OUT').length;
    const skipped = steps.filter(s => s.status === 'SKIPPED').length;

    return {
      project_name: config.projectName,
      scenario_name: `playwright-${config.testPattern || 'all'}`,
      environment: config.environment,
      status: failed > 0 ? (passed > 0 ? 'MIXED' : 'FAILED') : 'PASSED',
      total_steps: steps.length,
      passed_steps: passed,
      failed_steps: failed,
      skipped_steps: skipped,
      duration_ms: duration,
      steps,
      raw_output: exitCode !== 0 ? stderr.substring(0, 2000) : undefined,
    };
  }

  private async parseJsonOutput(jsonPath: string, stdout: string): Promise<PlaywrightStepResult[]> {
    let jsonData: any;

    try {
      const content = await readFile(jsonPath, 'utf-8');
      jsonData = JSON.parse(content);
    } catch {
      // JSON file not available, try parsing stdout
      try {
        jsonData = JSON.parse(stdout);
      } catch {
        return [];
      }
    }

    const steps: PlaywrightStepResult[] = [];

    if (jsonData?.suites) {
      this.extractTests(jsonData.suites, steps);
    }

    return steps;
  }

  private extractTests(suites: any[], steps: PlaywrightStepResult[]): void {
    for (const suite of suites) {
      if (suite.specs) {
        for (const spec of suite.specs) {
          for (const test of spec.tests || []) {
            for (const result of test.results || []) {
              const step: PlaywrightStepResult = {
                name: `${suite.title} > ${spec.title}`,
                status: this.mapStatus(result.status),
                started_at: new Date(result.startTime),
                finished_at: new Date(new Date(result.startTime).getTime() + result.duration),
                duration_ms: result.duration,
              };

              if (result.status === 'failed' || result.status === 'timedOut') {
                const errorMsg = result.errors?.[0]?.message || result.error?.message || 'Unknown error';
                step.error_message = errorMsg.substring(0, 500);
                step.error_category = this.categorizeError(errorMsg);
              }

              steps.push(step);
            }
          }
        }
      }

      if (suite.suites) {
        this.extractTests(suite.suites, steps);
      }
    }
  }

  private mapStatus(status: string): PlaywrightStepResult['status'] {
    switch (status) {
      case 'passed': return 'PASSED';
      case 'failed': return 'FAILED';
      case 'timedOut': return 'TIMED_OUT';
      case 'skipped': return 'SKIPPED';
      default: return 'FAILED';
    }
  }

  private categorizeError(message: string): string {
    if (message.includes('timeout') || message.includes('Timeout')) return 'TIMEOUT';
    if (message.includes('401') || message.includes('403')) return 'AUTH';
    if (message.includes('404')) return 'NOT_FOUND';
    if (message.includes('500')) return 'SERVER_ERROR';
    if (message.includes('selector') || message.includes('locator')) return 'SELECTOR';
    if (message.includes('navigation') || message.includes('Navigation')) return 'NAVIGATION';
    if (message.includes('ECONNREFUSED') || message.includes('connect')) return 'SERVICE_DOWN';
    return 'UNKNOWN';
  }
}
