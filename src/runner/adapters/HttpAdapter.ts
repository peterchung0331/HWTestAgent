/**
 * HTTP Adapter
 * Executes HTTP-based test steps
 */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

export interface HttpTestStep {
  name: string;
  type: 'http';
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  expect: {
    status?: number;
    json?: any;
    body_contains?: string;
    not?: {
      error?: string;
    };
  };
  timeout?: number;
  save?: Record<string, string>;
}

export interface HttpTestResult {
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  started_at: Date;
  finished_at: Date;
  duration_ms: number;
  error_message?: string;
  response_data?: {
    status: number;
    headers: any;
    body: any;
  };
}

export class HttpAdapter {
  private savedVariables: Map<string, any> = new Map();

  /**
   * Execute a single HTTP test step
   */
  async executeStep(step: HttpTestStep): Promise<HttpTestResult> {
    const started_at = new Date();

    try {
      console.log(`\n🌐 Executing HTTP step: ${step.name}`);
      console.log(`   ${step.method.toUpperCase()} ${step.url}`);

      // Replace variables in URL, headers, and body
      const url = this.replaceVariables(step.url);
      const headers = this.replaceVariables(step.headers || {});
      const body = this.replaceVariables(step.body);

      // Build axios config
      const config: AxiosRequestConfig = {
        method: step.method as any,
        url,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: step.timeout || 30000,
        validateStatus: () => true // Accept all status codes
      };

      if (body) {
        config.data = body;
      }

      // Execute request
      const response: AxiosResponse = await axios(config);

      // Save variables if specified
      if (step.save) {
        this.saveVariablesFromResponse(step.save, response.data);
      }

      // Validate response
      const validationError = this.validateResponse(step.expect, response);

      const finished_at = new Date();
      const duration_ms = finished_at.getTime() - started_at.getTime();

      if (validationError) {
        console.log(`   ❌ FAILED: ${validationError}`);

        return {
          name: step.name,
          status: 'FAILED',
          started_at,
          finished_at,
          duration_ms,
          error_message: validationError,
          response_data: {
            status: response.status,
            headers: response.headers,
            body: response.data
          }
        };
      }

      console.log(`   ✅ PASSED (${duration_ms}ms)`);

      return {
        name: step.name,
        status: 'PASSED',
        started_at,
        finished_at,
        duration_ms,
        response_data: {
          status: response.status,
          headers: response.headers,
          body: response.data
        }
      };

    } catch (error) {
      const finished_at = new Date();
      const duration_ms = finished_at.getTime() - started_at.getTime();

      const errorMessage = error instanceof AxiosError
        ? `${error.code || 'UNKNOWN'}: ${error.message}`
        : error instanceof Error
        ? error.message
        : 'Unknown error';

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
   * Validate response against expectations
   */
  private validateResponse(expect: HttpTestStep['expect'], response: AxiosResponse): string | null {
    // Check status code
    if (expect.status !== undefined && response.status !== expect.status) {
      return `Expected status ${expect.status}, got ${response.status}`;
    }

    // Check JSON structure
    if (expect.json) {
      const validationError = this.validateJsonStructure(expect.json, response.data);
      if (validationError) {
        return validationError;
      }
    }

    // Check body contains
    if (expect.body_contains) {
      const bodyString = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);

      if (!bodyString.includes(expect.body_contains)) {
        return `Response body does not contain: ${expect.body_contains}`;
      }
    }

    // Check NOT conditions
    if (expect.not?.error) {
      const bodyString = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);

      if (bodyString.includes(expect.not.error)) {
        return `Response contains unexpected error: ${expect.not.error}`;
      }
    }

    return null;
  }

  /**
   * Validate JSON structure recursively
   */
  private validateJsonStructure(expected: any, actual: any, path: string = 'root'): string | null {
    if (expected === '@array') {
      if (!Array.isArray(actual)) {
        return `${path}: Expected array, got ${typeof actual}`;
      }
      return null;
    }

    if (expected === '@string') {
      if (typeof actual !== 'string') {
        return `${path}: Expected string, got ${typeof actual}`;
      }
      return null;
    }

    if (expected === '@number') {
      if (typeof actual !== 'number') {
        return `${path}: Expected number, got ${typeof actual}`;
      }
      return null;
    }

    if (expected === '@boolean') {
      if (typeof actual !== 'boolean') {
        return `${path}: Expected boolean, got ${typeof actual}`;
      }
      return null;
    }

    if (typeof expected === 'object' && expected !== null && !Array.isArray(expected)) {
      if (typeof actual !== 'object' || actual === null) {
        return `${path}: Expected object, got ${typeof actual}`;
      }

      for (const key in expected) {
        if (!(key in actual)) {
          return `${path}.${key}: Missing property`;
        }

        const nestedError = this.validateJsonStructure(
          expected[key],
          actual[key],
          `${path}.${key}`
        );

        if (nestedError) {
          return nestedError;
        }
      }
    } else if (expected !== actual && typeof expected !== 'object') {
      return `${path}: Expected ${expected}, got ${actual}`;
    }

    return null;
  }

  /**
   * Replace variables in strings with saved values
   */
  private replaceVariables(value: any): any {
    if (typeof value === 'string') {
      // Replace {{VARIABLE}} with saved value
      return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        const savedValue = this.savedVariables.get(varName);
        if (savedValue === undefined) {
          console.warn(`   ⚠️  Variable ${varName} not found, using original: ${match}`);
          return match;
        }
        return savedValue;
      });
    }

    if (Array.isArray(value)) {
      return value.map(item => this.replaceVariables(item));
    }

    if (typeof value === 'object' && value !== null) {
      const result: any = {};
      for (const key in value) {
        result[key] = this.replaceVariables(value[key]);
      }
      return result;
    }

    return value;
  }

  /**
   * Save variables from response using JSONPath-like syntax
   */
  private saveVariablesFromResponse(saveConfig: Record<string, string>, responseData: any): void {
    for (const [varName, path] of Object.entries(saveConfig)) {
      const value = this.extractValueByPath(path, responseData);
      if (value !== undefined) {
        this.savedVariables.set(varName, value);
        console.log(`   💾 Saved variable: ${varName} = ${JSON.stringify(value).substring(0, 100)}`);
      } else {
        console.warn(`   ⚠️  Could not extract value for ${varName} from path: ${path}`);
      }
    }
  }

  /**
   * Extract value from object using JSONPath-like syntax
   * Supports: $.data.token, $.user.email, etc.
   */
  private extractValueByPath(path: string, data: any): any {
    if (!path.startsWith('$.')) {
      console.warn(`   ⚠️  Path should start with '$': ${path}`);
      return undefined;
    }

    const keys = path.substring(2).split('.');
    let current = data;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (Array.isArray(current)) {
        const index = parseInt(key, 10);
        if (!isNaN(index)) {
          current = current[index];
        } else {
          return undefined;
        }
      } else {
        current = current[key];
      }
    }

    return current;
  }

  /**
   * Get saved variable
   */
  getSavedVariable(name: string): any {
    return this.savedVariables.get(name);
  }

  /**
   * Set variable manually
   */
  setSavedVariable(name: string, value: any): void {
    this.savedVariables.set(name, value);
  }

  /**
   * Clear all saved variables
   */
  clearSavedVariables(): void {
    this.savedVariables.clear();
  }
}

export default HttpAdapter;
