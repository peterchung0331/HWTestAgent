/**
 * Scenario Loader
 * Loads and parses YAML test scenarios
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { HttpTestStep } from '../adapters/HttpAdapter.js';
import { RenoTestStep } from '../adapters/RenoAdapter.js';

// 통합 테스트 스텝 타입
export type TestStep = HttpTestStep | RenoTestStep;

export interface Scenario {
  name: string;
  slug: string;
  description: string;
  type: 'PRECISION' | 'SSO' | 'API' | 'E2E' | 'RENO_AI';
  environment: 'production' | 'staging' | 'local';
  priority?: string;
  schedule?: string;
  timeout: number;
  notify_on: string[];
  variables: Record<string, string>;
  steps: TestStep[];
  // Reno AI 전용 설정
  reno_config?: {
    base_url?: string;  // WBSalesHub URL (기본값 환경변수)
    pass_threshold?: number;  // 전체 통과율 기준
  };
}

export class ScenarioLoader {
  private scenariosPath: string;

  constructor(scenariosPath?: string) {
    this.scenariosPath = scenariosPath || join(process.cwd(), 'scenarios');
  }

  /**
   * Load a scenario from YAML file
   */
  loadScenario(projectName: string, scenarioSlug: string): Scenario {
    const filePath = join(this.scenariosPath, projectName, `${scenarioSlug}.yaml`);

    console.log(`📄 Loading scenario: ${filePath}`);

    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const parsed = yaml.load(fileContent) as any;

      return this.parseScenario(parsed);
    } catch (error) {
      throw new Error(`Failed to load scenario ${projectName}/${scenarioSlug}: ${error}`);
    }
  }

  /**
   * Parse YAML content into Scenario object
   */
  private parseScenario(data: any): Scenario {
    if (!data.name || !data.slug) {
      throw new Error('Scenario must have name and slug');
    }

    if (!data.steps || !Array.isArray(data.steps)) {
      throw new Error('Scenario must have steps array');
    }

    return {
      name: data.name,
      slug: data.slug,
      description: data.description || '',
      type: data.type || 'API',
      environment: data.environment || 'production',
      schedule: data.schedule,
      timeout: data.timeout || 300000,
      notify_on: data.notify_on || ['failure'],
      variables: data.variables || {},
      steps: data.steps.map((step: any, index: number) => this.parseStep(step, index))
    };
  }

  /**
   * Parse a single test step
   */
  private parseStep(step: any, index: number): TestStep {
    if (!step.name) {
      throw new Error(`Step ${index} must have a name`);
    }

    // Reno AI 타입 지원
    if (step.type === 'reno') {
      if (!step.scenario_ref) {
        throw new Error(`Reno step ${index} must have scenario_ref`);
      }
      return {
        name: step.name,
        type: 'reno',
        scenario_ref: step.scenario_ref,
        pass_threshold: step.pass_threshold,
        timeout: step.timeout
      } as RenoTestStep;
    }

    // HTTP 타입 (기본)
    if (step.type !== 'http') {
      throw new Error(`Unsupported step type: ${step.type}. Supported: 'http', 'reno'`);
    }

    return {
      name: step.name,
      type: 'http',
      method: step.method || 'GET',
      url: step.url,
      headers: step.headers || {},
      body: step.body,
      expect: step.expect || {},
      timeout: step.timeout,
      save: step.save
    } as HttpTestStep;
  }

  /**
   * List available scenarios for a project
   */
  listScenarios(projectName: string): string[] {
    try {
      const { readdirSync } = require('fs');
      const projectPath = join(this.scenariosPath, projectName);
      const files = readdirSync(projectPath);

      return files
        .filter((file: string) => file.endsWith('.yaml') || file.endsWith('.yml'))
        .map((file: string) => file.replace(/\.(yaml|yml)$/, ''));
    } catch (error) {
      console.warn(`Could not list scenarios for ${projectName}:`, error);
      return [];
    }
  }
}

export default ScenarioLoader;
