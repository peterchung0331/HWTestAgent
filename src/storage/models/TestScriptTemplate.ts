/**
 * TestScriptTemplate Model
 */

export type TemplateType = 'e2e' | 'integration' | 'unit';

export interface TestScriptTemplate {
  id: number;
  template_name: string;
  template_type: TemplateType;
  description?: string;
  script_content: string;
  variables: Record<string, string>; // { "PROJECT_NAME": "string", "BASE_URL": "string" }
  times_used: number;
  success_rate?: number;
  average_execution_time_seconds?: number;
  applicable_projects?: string[];
  applicable_environments?: string[];
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface CreateTestScriptTemplateInput {
  template_name: string;
  template_type: TemplateType;
  description?: string;
  script_content: string;
  variables: Record<string, string>;
  applicable_projects?: string[];
  applicable_environments?: string[];
  tags?: string[];
}

export interface UpdateTestScriptTemplateInput {
  template_name?: string;
  description?: string;
  script_content?: string;
  variables?: Record<string, string>;
  times_used?: number;
  success_rate?: number;
  average_execution_time_seconds?: number;
  applicable_projects?: string[];
  applicable_environments?: string[];
  tags?: string[];
}

export interface GenerateScriptInput {
  template_id: number;
  variables: Record<string, string>; // { "PROJECT_NAME": "WBHubManager", "BASE_URL": "http://localhost:3090" }
}

export interface GenerateScriptOutput {
  script: string;
  template_name: string;
}
