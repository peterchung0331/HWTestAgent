/**
 * Slack Notifier
 * Sends notifications to Slack via webhook
 */

import axios from 'axios';

export interface TestRunNotification {
  project_name: string;
  scenario_slug: string;
  scenario_name: string;
  status: 'PASSED' | 'FAILED';
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  auto_fixed_count: number;
  retry_count: number;
  duration_ms: number;
  started_at: Date;
  dashboard_url?: string;
  failed_steps_details?: Array<{
    name: string;
    error_message: string;
  }>;
}

export class SlackNotifier {
  private webhookUrl: string;
  private enabled: boolean;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
    this.enabled = !!this.webhookUrl;

    if (!this.enabled) {
      console.warn('⚠️  Slack notifications disabled: SLACK_WEBHOOK_URL not configured');
    }
  }

  /**
   * Send test run notification
   */
  async sendTestRunNotification(notification: TestRunNotification): Promise<void> {
    if (!this.enabled) {
      console.log('📧 Slack notification skipped (not configured)');
      return;
    }

    try {
      const message = this.buildTestRunMessage(notification);

      await axios.post(this.webhookUrl, {
        text: message.fallback,
        blocks: message.blocks
      });

      console.log('✅ Slack notification sent');
    } catch (error) {
      console.error('❌ Failed to send Slack notification:', error);
    }
  }

  /**
   * Build Slack message for test run
   */
  private buildTestRunMessage(notification: TestRunNotification): any {
    const {
      project_name,
      scenario_slug,
      scenario_name,
      status,
      total_steps,
      passed_steps,
      failed_steps,
      auto_fixed_count,
      retry_count,
      duration_ms,
      started_at,
      dashboard_url,
      failed_steps_details
    } = notification;

    const success_rate = ((passed_steps / total_steps) * 100).toFixed(1);
    const duration_sec = (duration_ms / 1000).toFixed(2);

    const emoji = status === 'PASSED' ? '✅' : '❌';
    const statusText = status === 'PASSED' ? 'PASSED' : 'FAILED';
    const color = status === 'PASSED' ? '#36a64f' : '#ff0000';

    const blocks: any[] = [];

    // Header
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} ${project_name} - ${scenario_name}`,
        emoji: true
      }
    });

    // Summary section
    const summary_fields = [
      {
        type: 'mrkdwn',
        text: `*Status:*\n${statusText}`
      },
      {
        type: 'mrkdwn',
        text: `*Success Rate:*\n${success_rate}%`
      },
      {
        type: 'mrkdwn',
        text: `*Duration:*\n${duration_sec}s`
      },
      {
        type: 'mrkdwn',
        text: `*Steps:*\n${passed_steps}/${total_steps} passed`
      }
    ];

    if (auto_fixed_count > 0) {
      summary_fields.push({
        type: 'mrkdwn',
        text: `*Auto-fixed:*\n🔧 ${auto_fixed_count} issues`
      });
    }

    if (retry_count > 0) {
      summary_fields.push({
        type: 'mrkdwn',
        text: `*Retries:*\n🔄 ${retry_count} attempts`
      });
    }

    blocks.push({
      type: 'section',
      fields: summary_fields
    });

    // Failed steps section (if any)
    if (failed_steps > 0 && failed_steps_details) {
      blocks.push({
        type: 'divider'
      });

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Failed Steps:*'
        }
      });

      for (const failed_step of failed_steps_details.slice(0, 5)) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `❌ *${failed_step.name}*\n\`\`\`${failed_step.error_message}\`\`\``
          }
        });
      }

      if (failed_steps_details.length > 5) {
        blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_... and ${failed_steps_details.length - 5} more failed steps_`
            }
          ]
        });
      }
    }

    // Auto-fix success message
    if (auto_fixed_count > 0 && status === 'PASSED') {
      blocks.push({
        type: 'divider'
      });

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🔧 *Auto-Fix Applied*\n${auto_fixed_count} issue(s) were automatically resolved after ${retry_count} retry attempt(s).`
        }
      });
    }

    // Dashboard link
    if (dashboard_url) {
      blocks.push({
        type: 'divider'
      });

      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📊 View Details',
              emoji: true
            },
            url: dashboard_url
          }
        ]
      });
    }

    // Footer
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Project: ${project_name} | Scenario: ${scenario_slug} | Started: ${this.formatDate(started_at)}`
        }
      ]
    });

    return {
      fallback: `${emoji} ${project_name} - ${scenario_name}: ${statusText} (${success_rate}%)`,
      blocks
    };
  }

  /**
   * Send simple text notification
   */
  async sendSimpleNotification(text: string): Promise<void> {
    if (!this.enabled) {
      console.log('📧 Slack notification skipped (not configured)');
      return;
    }

    try {
      await axios.post(this.webhookUrl, {
        text
      });

      console.log('✅ Slack notification sent');
    } catch (error) {
      console.error('❌ Failed to send Slack notification:', error);
    }
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  /**
   * Check if Slack notifications are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

export default new SlackNotifier();
