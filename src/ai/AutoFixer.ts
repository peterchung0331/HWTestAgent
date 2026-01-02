/**
 * AutoFixer
 * AI-powered automatic test failure resolution
 */

import { HttpTestStep, HttpTestResult } from '../runner/adapters/HttpAdapter.js';

export interface FixSuggestion {
  type: 'retry' | 'modify_request' | 'skip' | 'alert';
  reason: string;
  modifications?: {
    headers?: Record<string, string>;
    body?: any;
    url?: string;
    timeout?: number;
  };
  confidence: number; // 0-1
}

export class AutoFixer {
  /**
   * Analyze failure and suggest fix
   */
  async analyzeFix(
    step: HttpTestStep,
    result: HttpTestResult,
    project: string,
    scenario: string
  ): Promise<FixSuggestion> {
    console.log(`\n🔍 Analyzing failure: ${result.error_message}`);

    // Analyze common failure patterns
    const suggestion = this.analyzeCommonPatterns(step, result);

    return suggestion;
  }


  /**
   * Analyze common failure patterns
   */
  private analyzeCommonPatterns(step: HttpTestStep, result: HttpTestResult): FixSuggestion {
    const errorMsg = result.error_message || '';
    const status = result.response_data?.status;

    // Timeout errors - retry with longer timeout
    if (errorMsg.includes('ECONNABORTED') || errorMsg.includes('timeout')) {
      return {
        type: 'modify_request',
        reason: 'Request timed out - increasing timeout',
        modifications: {
          timeout: (step.timeout || 30000) * 2
        },
        confidence: 0.8
      };
    }

    // Connection errors - retry
    if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
      return {
        type: 'retry',
        reason: 'Connection error - service may be temporarily unavailable',
        confidence: 0.7
      };
    }

    // Rate limiting (429) - retry with delay
    if (status === 429) {
      return {
        type: 'retry',
        reason: 'Rate limited - will retry with delay',
        confidence: 0.9
      };
    }

    // Authentication errors (401, 403)
    if (status === 401 || status === 403) {
      return {
        type: 'alert',
        reason: 'Authentication failed - credentials may need updating',
        confidence: 0.9
      };
    }

    // Server errors (5xx) - retry
    if (status && status >= 500) {
      return {
        type: 'retry',
        reason: 'Server error - temporary issue, will retry',
        confidence: 0.7
      };
    }

    // Bad request (400) - alert (likely test issue)
    if (status === 400) {
      return {
        type: 'alert',
        reason: 'Bad request - test scenario may need updating',
        confidence: 0.8
      };
    }

    // Not found (404) - alert (endpoint may have changed)
    if (status === 404) {
      return {
        type: 'alert',
        reason: 'Endpoint not found - API may have changed',
        confidence: 0.9
      };
    }

    // Validation errors - check response body
    if (errorMsg.includes('Expected') && errorMsg.includes('got')) {
      return {
        type: 'alert',
        reason: 'Response validation failed - API response changed',
        confidence: 0.8
      };
    }

    // Unknown error - simple retry
    return {
      type: 'retry',
      reason: 'Unknown error - attempting retry',
      confidence: 0.5
    };
  }


  /**
   * Apply fix suggestion to test step
   */
  applyFix(step: HttpTestStep, suggestion: FixSuggestion): HttpTestStep {
    if (suggestion.type !== 'modify_request' || !suggestion.modifications) {
      return step;
    }

    console.log(`   🔧 Applying fix: ${suggestion.reason}`);

    return {
      ...step,
      ...(suggestion.modifications.url && { url: suggestion.modifications.url }),
      ...(suggestion.modifications.headers && {
        headers: { ...step.headers, ...suggestion.modifications.headers }
      }),
      ...(suggestion.modifications.body && { body: suggestion.modifications.body }),
      ...(suggestion.modifications.timeout && { timeout: suggestion.modifications.timeout })
    };
  }

  /**
   * Check if fix should be applied (based on confidence)
   */
  shouldApplyFix(suggestion: FixSuggestion, threshold: number = 0.6): boolean {
    return suggestion.confidence >= threshold;
  }
}

export default AutoFixer;
