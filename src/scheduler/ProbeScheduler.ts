/**
 * WorkHub Probe Scheduler
 * Cron-based automatic test execution
 */

import cron from 'node-cron';
import { PlaywrightAdapter, type PlaywrightRunConfig } from '../runner/adapters/PlaywrightAdapter.js';
import SlackNotifier from '../notification/SlackNotifier.js';

interface ScheduledJob {
  name: string;
  cron: string;
  config: PlaywrightRunConfig;
  task?: cron.ScheduledTask;
}

const HUB_REPOS: Record<string, string> = {
  WBHubManager: '/mnt/c/GitHub/WBHubManager',
  WBSalesHub: '/mnt/c/GitHub/WBSalesHub',
  WBFinHub: '/mnt/c/GitHub/WBFinHub',
  WBOnboardingHub: '/mnt/c/GitHub/WBOnboardingHub',
};

export class ProbeScheduler {
  private jobs: ScheduledJob[] = [];
  private adapter: PlaywrightAdapter;
  private running = false;

  constructor() {
    this.adapter = new PlaywrightAdapter();
  }

  /**
   * 기본 스케줄 등록 (Cross-Hub SSO + 허브별 E2E)
   */
  registerDefaultJobs(): void {
    // Cross-Hub SSO 테스트 — 매일 6AM, 6PM KST (21:00, 09:00 UTC)
    this.addJob({
      name: 'Cross-Hub SSO',
      cron: '0 21,9 * * *',
      config: {
        hubRepo: HUB_REPOS.WBHubManager,
        testPattern: '../WHCommon/packages/wh-probe/src/specs/cross-hub-sso.spec.ts',
        environment: 'production',
        projectName: 'Cross-Hub-SSO',
        timeout: 180_000,
      },
    });

    // HubManager E2E — 매일 6:30AM KST (21:30 UTC)
    this.addJob({
      name: 'HubManager E2E',
      cron: '30 21 * * *',
      config: {
        hubRepo: HUB_REPOS.WBHubManager,
        testPattern: 'tests/e2e/admin/**',
        environment: 'production',
        projectName: 'WBHubManager',
      },
    });
  }

  /**
   * 커스텀 잡 추가
   */
  addJob(job: Omit<ScheduledJob, 'task'>): void {
    if (!cron.validate(job.cron)) {
      console.error(`❌ Invalid cron expression for ${job.name}: ${job.cron}`);
      return;
    }
    this.jobs.push(job);
    console.log(`📋 Scheduled: ${job.name} (${job.cron})`);
  }

  /**
   * 모든 스케줄 시작
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    for (const job of this.jobs) {
      job.task = cron.schedule(job.cron, async () => {
        console.log(`\n⏰ Scheduled run: ${job.name}`);
        try {
          const result = await this.adapter.run(job.config);
          console.log(`📊 ${job.name}: ${result.status} (${result.passed_steps}/${result.total_steps})`);

          // 실패 시 Slack 알림
          if (result.status === 'FAILED' && SlackNotifier.isEnabled()) {
            await SlackNotifier.sendSimpleNotification(
              `⏰ Scheduled test failed: ${job.name}\n` +
              `Status: ${result.status} | ${result.passed_steps}/${result.total_steps} passed\n` +
              `Duration: ${(result.duration_ms / 1000).toFixed(1)}s`
            );
          }
        } catch (error) {
          console.error(`❌ Scheduled run failed: ${job.name}`, error);
          if (SlackNotifier.isEnabled()) {
            await SlackNotifier.sendSimpleNotification(
              `❌ Scheduled test error: ${job.name}\n${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      });
    }

    console.log(`\n🕐 Probe Scheduler started with ${this.jobs.length} job(s)`);
  }

  /**
   * 모든 스케줄 중지
   */
  stop(): void {
    for (const job of this.jobs) {
      job.task?.stop();
    }
    this.running = false;
    console.log('🛑 Probe Scheduler stopped');
  }

  /**
   * 등록된 잡 목록 반환
   */
  getJobs(): Array<{ name: string; cron: string; projectName: string }> {
    return this.jobs.map(j => ({
      name: j.name,
      cron: j.cron,
      projectName: j.config.projectName,
    }));
  }
}

export default new ProbeScheduler();
