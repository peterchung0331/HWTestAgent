/**
 * Debugging Checklist Models
 * 디버깅 체크리스트 데이터 모델
 */

// 체크리스트 카테고리
export type ChecklistCategory = 'sso' | 'docker' | 'database' | 'nginx' | 'api' | 'build' | 'git';

// 체크리스트 적용 범위
export type ChecklistScope = 'implementation' | 'debugging' | 'both';

// 체크 항목 심각도
export type ItemSeverity = 'critical' | 'high' | 'medium' | 'low';

// 디버깅 체크리스트 인터페이스
export interface DebuggingChecklist {
  id: number;
  category: ChecklistCategory;
  title: string;
  description?: string;
  scope: ChecklistScope;
  applicable_projects?: string[];
  priority: number;
  version: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// 체크리스트 항목 인터페이스
export interface ChecklistItem {
  id: number;
  checklist_id: number;
  item_order: number;
  title: string;
  description?: string;
  severity: ItemSeverity;
  code_example?: string;
  anti_pattern?: string;
  related_error_pattern_ids?: number[];
  reference_docs?: string[];
  keywords?: string[];
  created_at: Date;
  updated_at: Date;
}

// 체크리스트 + 항목 포함 인터페이스
export interface ChecklistWithItems extends DebuggingChecklist {
  items: ChecklistItem[];
}

// 체크리스트 요약 뷰 (v_checklists_summary)
export interface ChecklistSummary {
  id: number;
  category: ChecklistCategory;
  title: string;
  description?: string;
  scope: ChecklistScope;
  applicable_projects?: string[];
  priority: number;
  version: string;
  is_active: boolean;
  item_count: number;
  critical_count: number;
  high_count: number;
  created_at: Date;
  updated_at: Date;
}

// 생성 입력 인터페이스
export interface CreateChecklistInput {
  category: ChecklistCategory;
  title: string;
  description?: string;
  scope?: ChecklistScope;
  applicable_projects?: string[];
  priority?: number;
  version?: string;
}

export interface CreateChecklistItemInput {
  checklist_id: number;
  item_order: number;
  title: string;
  description?: string;
  severity?: ItemSeverity;
  code_example?: string;
  anti_pattern?: string;
  related_error_pattern_ids?: number[];
  reference_docs?: string[];
  keywords?: string[];
}

// 수정 입력 인터페이스
export interface UpdateChecklistInput {
  category?: ChecklistCategory;
  title?: string;
  description?: string;
  scope?: ChecklistScope;
  applicable_projects?: string[];
  priority?: number;
  version?: string;
  is_active?: boolean;
}

export interface UpdateChecklistItemInput {
  item_order?: number;
  title?: string;
  description?: string;
  severity?: ItemSeverity;
  code_example?: string;
  anti_pattern?: string;
  related_error_pattern_ids?: number[];
  reference_docs?: string[];
  keywords?: string[];
}

// 검색 필터 인터페이스
export interface ChecklistFilters {
  category?: ChecklistCategory;
  scope?: ChecklistScope;
  project?: string;
  query?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}
