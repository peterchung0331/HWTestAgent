/**
 * Scenario Learner
 * Analyzes test results and suggests scenario improvements
 */

import TestRepository from '../storage/repositories/TestRepository.js';

export interface ScenarioAnalysis {
  project_name: string;
  scenario_slug: string;
  total_runs: number;
  success_rate: number;
  avg_duration_ms: number;
  most_common_failures: Array<{
    step_name: string;
    failure_count: number;
    error_messages: string[];
  }>;
  recommendations: string[];
  utility_score: number; // 0-100
}

export interface ScenarioImprovement {
  scenario_slug: string;
  improvement_type: 'timeout' | 'assertion' | 'step_order' | 'new_step' | 'remove_step';
  description: string;
  old_value?: string;
  new_value?: string;
  confidence: number;
}

export class ScenarioLearner {
  /**
   * Analyze scenario performance and suggest improvements
   */
  async analyzeScenario(project: string, scenarioSlug: string, days: number = 30): Promise<ScenarioAnalysis> {
    console.log(`\n📊 Analyzing scenario: ${project}/${scenarioSlug}`);
    console.log(`   Period: Last ${days} days\n`);

    // Get test statistics
    const stats = await TestRepository.getTestStatistics(project, days);

    // Get failed steps details
    const mostCommonFailures = await this.getMostCommonFailures(project, scenarioSlug, days);

    // Calculate utility score
    const utilityScore = this.calculateUtilityScore(stats);

    // Generate recommendations
    const recommendations = this.generateRecommendations(stats, mostCommonFailures);

    const analysis: ScenarioAnalysis = {
      project_name: project,
      scenario_slug: scenarioSlug,
      total_runs: stats.total_runs,
      success_rate: stats.success_rate,
      avg_duration_ms: stats.avg_duration_ms,
      most_common_failures: mostCommonFailures,
      recommendations,
      utility_score: utilityScore
    };

    console.log('✅ Analysis complete');
    console.log(`   Total runs: ${analysis.total_runs}`);
    console.log(`   Success rate: ${analysis.success_rate.toFixed(1)}%`);
    console.log(`   Utility score: ${analysis.utility_score}/100`);
    console.log(`   Recommendations: ${analysis.recommendations.length}`);

    return analysis;
  }

  /**
   * Get most common failure steps
   */
  private async getMostCommonFailures(
    project: string,
    scenarioSlug: string,
    days: number
  ): Promise<ScenarioAnalysis['most_common_failures']> {
    const recentRuns = await TestRepository.getRecentTestRuns(100, project);

    const failureMap = new Map<string, { count: number; errors: Set<string> }>();

    for (const run of recentRuns) {
      if (run.scenario_slug !== scenarioSlug) continue;

      const details = await TestRepository.getTestRunWithSteps(run.id);
      if (!details) continue;

      for (const step of details.steps) {
        if (step.status === 'FAILED') {
          const existing = failureMap.get(step.name) || { count: 0, errors: new Set() };
          existing.count++;
          if (step.error_message) {
            existing.errors.add(step.error_message);
          }
          failureMap.set(step.name, existing);
        }
      }
    }

    return Array.from(failureMap.entries())
      .map(([step_name, data]) => ({
        step_name,
        failure_count: data.count,
        error_messages: Array.from(data.errors).slice(0, 3) // Top 3 unique errors
      }))
      .sort((a, b) => b.failure_count - a.failure_count)
      .slice(0, 5); // Top 5 failing steps
  }

  /**
   * Calculate utility score (0-100)
   * Based on: success rate, frequency, failure patterns
   */
  private calculateUtilityScore(stats: any): number {
    // Success rate weight: 50%
    const successWeight = stats.success_rate * 0.5;

    // Frequency weight: 30% (more runs = more useful)
    const frequencyScore = Math.min(stats.total_runs / 100, 1) * 30;

    // Consistency weight: 20% (consistent results = more reliable)
    const consistencyScore = stats.success_rate > 90 || stats.success_rate < 10
      ? 20 // Very consistent (always pass or always fail)
      : 20 - Math.abs(stats.success_rate - 50) / 5; // Flaky tests score lower

    return Math.round(successWeight + frequencyScore + consistencyScore);
  }

  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(stats: any, failures: ScenarioAnalysis['most_common_failures']): string[] {
    const recommendations: string[] = [];

    // Low success rate
    if (stats.success_rate < 50) {
      recommendations.push(
        `⚠️ Low success rate (${stats.success_rate.toFixed(1)}%) - Review scenario reliability`
      );
    }

    // High failure rate on specific steps
    if (failures.length > 0 && failures[0].failure_count > stats.total_runs * 0.5) {
      recommendations.push(
        `🔧 Step "${failures[0].step_name}" fails frequently (${failures[0].failure_count}/${stats.total_runs}) - Consider updating or removing`
      );
    }

    // Slow execution
    if (stats.avg_duration_ms > 60000) {
      recommendations.push(
        `⏱️ Slow execution (${(stats.avg_duration_ms / 1000).toFixed(1)}s avg) - Consider optimizing or splitting into smaller scenarios`
      );
    }

    // Low utility score
    const utilityScore = this.calculateUtilityScore(stats);
    if (utilityScore < 40) {
      recommendations.push(
        `📉 Low utility score (${utilityScore}/100) - Consider archiving if not providing value`
      );
    }

    // Flaky test detection
    if (stats.success_rate > 30 && stats.success_rate < 70) {
      recommendations.push(
        `⚡ Flaky test detected (${stats.success_rate.toFixed(1)}% success) - Investigate intermittent failures`
      );
    }

    // Always passing
    if (stats.success_rate > 99 && stats.total_runs > 50) {
      recommendations.push(
        `✅ Highly reliable test (${stats.success_rate.toFixed(1)}% success) - Good baseline for production monitoring`
      );
    }

    // Common error patterns
    for (const failure of failures.slice(0, 2)) {
      if (failure.error_messages.length > 0) {
        const errorMsg = failure.error_messages[0];

        if (errorMsg.includes('timeout')) {
          recommendations.push(
            `⏰ Timeout issues in "${failure.step_name}" - Consider increasing timeout or investigating slow API`
          );
        }

        if (errorMsg.includes('401') || errorMsg.includes('403')) {
          recommendations.push(
            `🔐 Auth issues in "${failure.step_name}" - Update credentials or token refresh logic`
          );
        }

        if (errorMsg.includes('404')) {
          recommendations.push(
            `🔍 Endpoint not found in "${failure.step_name}" - API endpoint may have changed`
          );
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✨ No issues detected - scenario is performing well');
    }

    return recommendations;
  }

  /**
   * Suggest specific scenario improvements
   */
  async suggestImprovements(project: string, scenarioSlug: string): Promise<ScenarioImprovement[]> {
    const analysis = await this.analyzeScenario(project, scenarioSlug);
    const improvements: ScenarioImprovement[] = [];

    // Suggest timeout increases for timeout errors
    for (const failure of analysis.most_common_failures) {
      if (failure.error_messages.some(msg => msg.includes('timeout'))) {
        improvements.push({
          scenario_slug: scenarioSlug,
          improvement_type: 'timeout',
          description: `Increase timeout for step "${failure.step_name}" due to frequent timeout errors`,
          old_value: '30000ms',
          new_value: '60000ms',
          confidence: 0.8
        });
      }
    }

    // Suggest removal of consistently failing steps
    for (const failure of analysis.most_common_failures) {
      if (failure.failure_count > analysis.total_runs * 0.8) {
        improvements.push({
          scenario_slug: scenarioSlug,
          improvement_type: 'remove_step',
          description: `Consider removing step "${failure.step_name}" - fails ${failure.failure_count}/${analysis.total_runs} times`,
          confidence: 0.7
        });
      }
    }

    // Suggest archiving low-utility scenarios
    if (analysis.utility_score < 30 && analysis.total_runs > 20) {
      improvements.push({
        scenario_slug: scenarioSlug,
        improvement_type: 'remove_step',
        description: `Consider archiving entire scenario - low utility score (${analysis.utility_score}/100)`,
        confidence: 0.6
      });
    }

    return improvements;
  }

  /**
   * Identify scenarios that should be archived
   */
  async findLowUtilityScenarios(project: string, threshold: number = 40): Promise<string[]> {
    const stats = await TestRepository.getTestStatistics(project, 30);
    const utilityScore = this.calculateUtilityScore(stats);

    if (utilityScore < threshold && stats.total_runs > 10) {
      return [project];
    }

    return [];
  }

  /**
   * Generate daily learning report
   */
  async generateDailyReport(project: string): Promise<string> {
    const stats = await TestRepository.getTestStatistics(project, 1); // Last 24 hours

    let report = `📊 Daily Test Report - ${project}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    report += `Overall Statistics:\n`;
    report += `  • Total runs: ${stats.total_runs}\n`;
    report += `  • Success rate: ${stats.success_rate.toFixed(1)}%\n`;
    report += `  • Avg duration: ${(stats.avg_duration_ms / 1000).toFixed(1)}s\n`;
    report += `  • Auto-fixes: ${stats.total_auto_fixes}\n\n`;

    // Recommendations
    const lowUtility = await this.findLowUtilityScenarios(project);
    if (lowUtility.length > 0) {
      report += `⚠️ Low Utility Warning\n`;
    } else {
      report += `✅ All tests performing well\n`;
    }

    return report;
  }
}

export default ScenarioLearner;
