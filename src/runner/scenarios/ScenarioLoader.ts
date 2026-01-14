/**
 * Scenario Loader
 * Loads and parses YAML test scenarios
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { HttpTestStep } from '../adapters/HttpAdapter.js';

export interface Scenario {
  name: string;
  slug: string;
  description: string;
  type: 'PRECISION' | 'SSO' | 'API' | 'E2E';
  environment: 'production' | 'staging' | 'local';
  priority?: string;
  schedule?: string;
  timeout: number;
  notify_on: string[];
  variables: Record<string, string>;
  steps: HttpTestStep[];
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
  private parseStep(step: any, index: number): HttpTestStep {
    if (!step.name) {
      throw new Error(`Step ${index} must have a name`);
    }

    if (step.type !== 'http') {
      throw new Error(`Only 'http' type is supported, got: ${step.type}`);
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
    };
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
