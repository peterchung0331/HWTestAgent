/**
 * Template Engine Service
 * Variable substitution for test script templates
 */

import TemplateRepository from '../storage/repositories/TemplateRepository.js';
import { GenerateScriptInput, GenerateScriptOutput } from '../storage/models/TestScriptTemplate.js';

export class TemplateEngineService {
  /**
   * Generate script from template with variable substitution
   */
  async generateScript(input: GenerateScriptInput): Promise<GenerateScriptOutput> {
    // Get template
    const template = await TemplateRepository.getTemplateById(input.template_id);
    if (!template) {
      throw new Error(`Template not found: ${input.template_id}`);
    }

    // Validate required variables
    const requiredVars = Object.keys(template.variables);
    const providedVars = Object.keys(input.variables);

    const missingVars = requiredVars.filter(v => !providedVars.includes(v));
    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    // Perform variable substitution
    let script = template.script_content;

    for (const [key, value] of Object.entries(input.variables)) {
      const placeholder = `{{${key}}}`;
      script = script.replaceAll(placeholder, value);
    }

    return {
      script,
      template_name: template.template_name
    };
  }

  /**
   * Validate template variables
   */
  validateVariables(template: any, variables: Record<string, string>): boolean {
    const requiredVars = Object.keys(template.variables);
    const providedVars = Object.keys(variables);

    return requiredVars.every(v => providedVars.includes(v));
  }

  /**
   * List templates with filters
   */
  async listTemplates(filters: { type?: string; tags?: string[] }) {
    return await TemplateRepository.searchTemplates({
      type: filters.type as any,
      tags: filters.tags,
      limit: 100
    });
  }
}

export default new TemplateEngineService();
