/**
 * Test Scheduler
 * Runs scheduled tests using node-cron
 */

import cron from 'node-cron';
import { TestRunner } from '../runner/TestRunner.js';
import { ScenarioLoader } from '../runner/scenarios/ScenarioLoader.js';
import { ScenarioLearner } from '../ai/ScenarioLearner.js';
import SlackNotifier from '../notification/SlackNotifier.js';

export interface ScheduledTest {
  project: string;
  scenario: string;
  schedule: string; // Cron expression
  enabled: boolean;
  task?: cron.ScheduledTask;
}

export class TestScheduler {
  private scheduledTests: Map<string, ScheduledTest> = new Map();
  private testRunner: TestRunner;
  private scenarioLoader: ScenarioLoader;
  private scenarioLearner: ScenarioLearner;

  constructor() {
    this.testRunner = new TestRunner();
    this.scenarioLoader = new ScenarioLoader();
    this.scenarioLearner = new ScenarioLearner();
  }

  /**
   * Initialize scheduler with scenarios from directory
   */
  async initialize(): Promise<void> {
    console.log('\n⏰ Initializing Test Scheduler...\n');

    const projects = ['wbhubmanager', 'wbsaleshub', 'wbfinhub', 'wbonboardinghub'];

    for (const project of projects) {
      const scenarios = this.scenarioLoader.listScenarios(project);

      for (const scenarioSlug of scenarios) {
        try {
          const scenario = this.scenarioLoader.loadScenario(project, scenarioSlug);

          if (scenario.schedule) {
            this.scheduleTest(project, scenarioSlug, scenario.schedule);
          }
        } catch (error) {
          console.warn(`   ⚠️  Could not load ${project}/${scenarioSlug}:`, error);
        }
      }
    }

    // Schedule daily learning report (every day at 9 AM)
    this.scheduleDailyReport();

    console.log(`✅ Scheduler initialized with ${this.scheduledTests.size} scheduled tests\n`);
  }

  /**
   * Schedule a test
   */
  scheduleTest(project: string, scenario: string, schedule: string): void {
    const key = `${project}/${scenario}`;

    // Validate cron expression
    if (!cron.validate(schedule)) {
      console.error(`   ❌ Invalid cron expression for ${key}: ${schedule}`);
      return;
    }

    // Cancel existing task if any
    const existing = this.scheduledTests.get(key);
    if (existing?.task) {
      existing.task.stop();
    }

    // Create new scheduled task
    const task = cron.schedule(schedule, async () => {
      console.log(`\n⏰ Scheduled test triggered: ${key}`);

      try {
        const result = await this.testRunner.run({
          project,
          scenario,
          environment: 'production',
          triggered_by: 'schedule',
          auto_fix: true,
          max_retry: 3
        });

        // Send Slack notification if enabled
        if (SlackNotifier.isEnabled()) {
          await SlackNotifier.sendSimpleNotification(
            `⏰ Scheduled test completed: ${key} - ${result.status} (${result.passed_steps}/${result.total_steps} passed)`
          );
        }
      } catch (error) {
        console.error(`❌ Scheduled test failed: ${key}`, error);

        if (SlackNotifier.isEnabled()) {
          await SlackNotifier.sendSimpleNotification(
            `❌ Scheduled test error: ${key} - ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    });

    this.scheduledTests.set(key, {
      project,
      scenario,
      schedule,
      enabled: true,
      task
    });

    console.log(`   ✅ Scheduled: ${key} (${schedule})`);
  }

  /**
   * Schedule daily learning report
   */
  private scheduleDailyReport(): void {
    // Every day at 9 AM
    const task = cron.schedule('0 9 * * *', async () => {
      console.log('\n📊 Generating daily learning report...');

      try {
        const projects = ['wbhubmanager', 'wbsaleshub', 'wbfinhub', 'wbonboardinghub'];

        for (const project of projects) {
          const report = await this.scenarioLearner.generateDailyReport(project);

          console.log(`\n${report}\n`);

          if (SlackNotifier.isEnabled()) {
            await SlackNotifier.sendSimpleNotification(report);
          }
        }
      } catch (error) {
        console.error('❌ Failed to generate daily report:', error);
      }
    });

    console.log('   ✅ Scheduled: Daily learning report (9 AM)');
  }

  /**
   * Enable a scheduled test
   */
  enableTest(project: string, scenario: string): boolean {
    const key = `${project}/${scenario}`;
    const test = this.scheduledTests.get(key);

    if (!test) {
      console.error(`   ❌ Test not found: ${key}`);
      return false;
    }

    if (test.task) {
      test.task.start();
      test.enabled = true;
      console.log(`   ✅ Enabled: ${key}`);
      return true;
    }

    return false;
  }

  /**
   * Disable a scheduled test
   */
  disableTest(project: string, scenario: string): boolean {
    const key = `${project}/${scenario}`;
    const test = this.scheduledTests.get(key);

    if (!test) {
      console.error(`   ❌ Test not found: ${key}`);
      return false;
    }

    if (test.task) {
      test.task.stop();
      test.enabled = false;
      console.log(`   ⏸️  Disabled: ${key}`);
      return true;
    }

    return false;
  }

  /**
   * Remove a scheduled test
   */
  removeTest(project: string, scenario: string): boolean {
    const key = `${project}/${scenario}`;
    const test = this.scheduledTests.get(key);

    if (!test) {
      console.error(`   ❌ Test not found: ${key}`);
      return false;
    }

    if (test.task) {
      test.task.stop();
    }

    this.scheduledTests.delete(key);
    console.log(`   🗑️  Removed: ${key}`);
    return true;
  }

  /**
   * Get all scheduled tests
   */
  getScheduledTests(): ScheduledTest[] {
    return Array.from(this.scheduledTests.values()).map(test => ({
      project: test.project,
      scenario: test.scenario,
      schedule: test.schedule,
      enabled: test.enabled
    }));
  }

  /**
   * Stop all scheduled tests
   */
  stopAll(): void {
    console.log('\n⏸️  Stopping all scheduled tests...');

    for (const test of this.scheduledTests.values()) {
      if (test.task) {
        test.task.stop();
      }
    }

    console.log('✅ All scheduled tests stopped\n');
  }
}

export default TestScheduler;
