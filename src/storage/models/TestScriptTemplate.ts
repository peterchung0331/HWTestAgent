/**
 * TestScriptTemplate Model
 */

export interface TestScriptTemplate {
  id: number;

  // 템플릿 식별
  template_name: string;
  template_type: 'e2e' | 'integration' | 'unit';
  description?: string;

  // 템플릿 내용
  script_content: string;
  variables: Record<string, string>;

  // 사용 통계
  times_used: number;
  success_rate?: number;
  average_execution_time_seconds?: number;

  // 적용 범위
  applicable_projects?: string[];
  applicable_environments?: string[];

  // 태그
  tags?: string[];

  created_at: Date;
  updated_at: Date;
}

export type TemplateType = 'e2e' | 'integration' | 'unit';

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
  template_type?: TemplateType;
  description?: string;
  script_content?: string;
  variables?: Record<string, string>;
  applicable_projects?: string[];
  applicable_environments?: string[];
  tags?: string[];
}

export interface GenerateScriptInput {
  template_id: number;
  variables: Record<string, string>;
}

export interface GenerateScriptOutput {
  script: string;
  template_name: string;
}
