/**
 * Reno Adapter
 * Executes Reno AI bot test steps via WBSalesHub API
 */

import axios, { AxiosError } from 'axios';
import { ErrorCategory } from '../../storage/models/ErrorPattern.js';

// WBSalesHub API 응답 타입
export interface RenoTestReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: string;
    duration: string;
  };
  environment: {
    node: string;
    timestamp: string;
    anthropicModel?: string;
  };
  results: RenoTestResult[];
  failureAnalysis: {
    byType: Record<string, number>;
    commonPatterns: string[];
    suggestedFixes: string[];
  };
  generatedAt: string;
}

export interface RenoTestResult {
  testCaseId: string;
  testCaseName?: string;
  passed: boolean;
  score: number;
  duration: number;
  input: string;
  actualResponse: string;
  toolCalls: Array<{
    name: string;
    input: Record<string, unknown>;
    output: string;
    timestamp: string;
  }>;
  evaluation: {
    toolEvaluation: {
      passed: boolean;
      expectedTools: string[];
      actualTools: string[];
      missingTools: string[];
      unexpectedTools: string[];
      argsMatch: boolean;
      details: string[];
    };
    responseEvaluation: {
      passed: boolean;
      conceptCoverage: number;
      foundConcepts: string[];
      missingConcepts: string[];
      forbiddenTermsFound: string[];
      toneMatch: boolean;
      formattingIssues: string[];
      score: number;
    };
    overallScore: number;
    passed: boolean;
  };
  suggestions?: string[];
  error?: string;
}

// HWTestAgent용 테스트 스텝 타입
export interface RenoTestStep {
  name: string;
  type: 'reno';
  scenario_ref: string;  // WBSalesHub 시나리오 이름 (예: 'customer-query')
  pass_threshold?: number;  // 최소 통과율 (기본 0.6)
  timeout?: number;  // 타임아웃 (기본 300000 = 5분)
}

export interface RenoTestStepResult {
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  started_at: Date;
  finished_at: Date;
  duration_ms: number;
  error_message?: string;
  response_data?: RenoTestReport;
  // Reno 전용 추가 정보
  reno_details?: {
    total_tests: number;
    passed_tests: number;
    failed_tests: number;
    pass_rate: number;
    failed_test_ids: string[];
    suggestions: string[];
  };
}

export interface RenoAdapterConfig {
  baseUrl: string;  // WBSalesHub API URL (예: 'http://localhost:4010')
  timeout?: number;
  verbose?: boolean;
}

export class RenoAdapter {
  private config: RenoAdapterConfig;

  constructor(config: RenoAdapterConfig) {
    this.config = {
      timeout: 300000,  // 5분 기본
      verbose: false,
      ...config
    };
  }

  /**
   * Execute a Reno test step
   */
  async executeStep(step: RenoTestStep): Promise<RenoTestStepResult> {
    const started_at = new Date();
    const passThreshold = step.pass_threshold ?? 0.6;

    try {
      console.log(`\n🤖 Executing Reno AI step: ${step.name}`);
      console.log(`   Scenario: ${step.scenario_ref}`);
      console.log(`   Pass threshold: ${(passThreshold * 100).toFixed(0)}%`);

      // Call WBSalesHub API
      const response = await axios.post(
        `${this.config.baseUrl}/api/reno-test/run-sync`,
        {
          scenario: step.scenario_ref,
          verbose: this.config.verbose
        },
        {
          timeout: step.timeout ?? this.config.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const report: RenoTestReport = response.data.report;
      const finished_at = new Date();
      const duration_ms = finished_at.getTime() - started_at.getTime();

      // Calculate pass rate
      const passRate = report.summary.total > 0
        ? report.summary.passed / report.summary.total
        : 0;

      const passed = passRate >= passThreshold;

      // Extract failed test IDs and suggestions
      const failedTestIds = report.results
        .filter(r => !r.passed)
        .map(r => r.testCaseId);

      const allSuggestions = report.results
        .flatMap(r => r.suggestions || [])
        .concat(report.failureAnalysis.suggestedFixes)
        .filter((s, i, arr) => arr.indexOf(s) === i);  // 중복 제거

      if (passed) {
        console.log(`   ✅ PASSED (${(passRate * 100).toFixed(1)}% >= ${(passThreshold * 100).toFixed(0)}%)`);
      } else {
        console.log(`   ❌ FAILED (${(passRate * 100).toFixed(1)}% < ${(passThreshold * 100).toFixed(0)}%)`);
        console.log(`   Failed tests: ${failedTestIds.join(', ')}`);
      }

      return {
        name: step.name,
        status: passed ? 'PASSED' : 'FAILED',
        started_at,
        finished_at,
        duration_ms,
        error_message: passed ? undefined : `Pass rate ${(passRate * 100).toFixed(1)}% below threshold ${(passThreshold * 100).toFixed(0)}%`,
        response_data: report,
        reno_details: {
          total_tests: report.summary.total,
          passed_tests: report.summary.passed,
          failed_tests: report.summary.failed,
          pass_rate: passRate,
          failed_test_ids: failedTestIds,
          suggestions: allSuggestions
        }
      };

    } catch (error) {
      const finished_at = new Date();
      const duration_ms = finished_at.getTime() - started_at.getTime();

      let errorMessage: string;
      if (error instanceof AxiosError) {
        if (error.code === 'ECONNREFUSED') {
          errorMessage = `WBSalesHub not available at ${this.config.baseUrl}`;
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          errorMessage = `Timeout: Reno test took too long (${step.timeout ?? this.config.timeout}ms)`;
        } else if (error.response) {
          errorMessage = `API Error: ${error.response.status} - ${error.response.data?.error || error.message}`;
        } else {
          errorMessage = `Network Error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Unknown error';
      }

      console.log(`   ❌ FAILED: ${errorMessage}`);

      return {
        name: step.name,
        status: 'FAILED',
        started_at,
        finished_at,
        duration_ms,
        error_message: errorMessage
      };
    }
  }

  /**
   * Map Reno test failure to ErrorCategory
   */
  static mapToErrorCategory(result: RenoTestResult): ErrorCategory {
    const evaluation = result.evaluation;

    // 도구 관련 실패
    if (evaluation.toolEvaluation && !evaluation.toolEvaluation.passed) {
      if (evaluation.toolEvaluation.missingTools.length > 0) {
        return 'RENO_TOOL_MISSING' as ErrorCategory;
      }
      if (!evaluation.toolEvaluation.argsMatch) {
        return 'RENO_TOOL_ARGS' as ErrorCategory;
      }
    }

    // 응답 관련 실패
    if (evaluation.responseEvaluation && !evaluation.responseEvaluation.passed) {
      if (evaluation.responseEvaluation.missingConcepts.length > 0) {
        return 'RENO_CONCEPT_MISSING' as ErrorCategory;
      }
      if (evaluation.responseEvaluation.forbiddenTermsFound.length > 0) {
        return 'RENO_FORBIDDEN_TERM' as ErrorCategory;
      }
      if (evaluation.responseEvaluation.formattingIssues.length > 0) {
        return 'RENO_FORMATTING' as ErrorCategory;
      }
      if (!evaluation.responseEvaluation.toneMatch) {
        return 'RENO_TONE' as ErrorCategory;
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Generate error hash for deduplication
   */
  static generateErrorHash(result: RenoTestResult): string {
    const parts: string[] = [result.testCaseId];

    if (!result.evaluation.toolEvaluation.passed) {
      parts.push('tool', ...result.evaluation.toolEvaluation.missingTools.sort());
    }

    if (!result.evaluation.responseEvaluation.passed) {
      parts.push('response', ...result.evaluation.responseEvaluation.missingConcepts.sort().slice(0, 3));
    }

    // 간단한 해시 생성
    const str = parts.join(':');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `reno_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Generate error message for storage
   */
  static generateErrorMessage(result: RenoTestResult): string {
    const parts: string[] = [];

    if (!result.evaluation.toolEvaluation.passed) {
      if (result.evaluation.toolEvaluation.missingTools.length > 0) {
        parts.push(`Missing tools: ${result.evaluation.toolEvaluation.missingTools.join(', ')}`);
      }
      if (!result.evaluation.toolEvaluation.argsMatch) {
        parts.push(`Tool args mismatch: ${result.evaluation.toolEvaluation.details.join('; ')}`);
      }
    }

    if (!result.evaluation.responseEvaluation.passed) {
      if (result.evaluation.responseEvaluation.missingConcepts.length > 0) {
        parts.push(`Missing concepts: ${result.evaluation.responseEvaluation.missingConcepts.join(', ')}`);
      }
      if (result.evaluation.responseEvaluation.forbiddenTermsFound.length > 0) {
        parts.push(`Forbidden terms: ${result.evaluation.responseEvaluation.forbiddenTermsFound.join(', ')}`);
      }
      if (result.evaluation.responseEvaluation.formattingIssues.length > 0) {
        parts.push(`Formatting: ${result.evaluation.responseEvaluation.formattingIssues.join(', ')}`);
      }
    }

    if (result.error) {
      parts.push(`Error: ${result.error}`);
    }

    return parts.join(' | ') || 'Unknown Reno test failure';
  }
}

export default RenoAdapter;
