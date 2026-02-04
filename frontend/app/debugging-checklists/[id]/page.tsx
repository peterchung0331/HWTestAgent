'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { getChecklistById } from '@/lib/api';
import { ChecklistWithItems, ChecklistItem, ChecklistCategory } from '@/lib/types';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Code,
  XCircle,
  ExternalLink,
  Shield,
  Database,
  Globe,
  Server,
  GitBranch,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// 카테고리별 색상 및 아이콘 매핑
const categoryConfig: Record<ChecklistCategory, { color: string; bgColor: string; icon: typeof Shield }> = {
  sso: { color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Shield },
  docker: { color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Server },
  database: { color: 'text-green-700', bgColor: 'bg-green-100', icon: Database },
  nginx: { color: 'text-orange-700', bgColor: 'bg-orange-100', icon: Globe },
  api: { color: 'text-cyan-700', bgColor: 'bg-cyan-100', icon: Code },
  build: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Code },
  git: { color: 'text-red-700', bgColor: 'bg-red-100', icon: GitBranch },
};

// 심각도별 스타일
const severityConfig = {
  critical: { color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-300', label: 'Critical' },
  high: { color: 'text-orange-700', bgColor: 'bg-orange-100', borderColor: 'border-orange-300', label: 'High' },
  medium: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-300', label: 'Medium' },
  low: { color: 'text-green-700', bgColor: 'bg-green-100', borderColor: 'border-green-300', label: 'Low' },
};

// 코드 블록 컴포넌트
function CodeBlock({ code, title, type }: { code: string; title: string; type: 'good' | 'bad' }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`rounded-lg border ${type === 'good' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium ${type === 'good' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}
      >
        <span className="flex items-center">
          {type === 'good' ? (
            <CheckCircle2 className="w-4 h-4 mr-2" />
          ) : (
            <XCircle className="w-4 h-4 mr-2" />
          )}
          {title}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <pre className="p-4 text-sm overflow-x-auto">
          <code className="text-gray-800 whitespace-pre-wrap">{code}</code>
        </pre>
      )}
    </div>
  );
}

// 체크리스트 아이템 컴포넌트
function ChecklistItemCard({ item, index }: { item: ChecklistItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const severity = severityConfig[item.severity];

  return (
    <div className={`bg-white rounded-lg border ${severity.borderColor} shadow-sm overflow-hidden`}>
      {/* 헤더 */}
      <div
        className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${severity.bgColor} ${severity.color}`}>
              {severity.label}
            </span>
          </div>
          <h3 className="text-base font-medium text-gray-900">{item.title}</h3>
          {item.description && !expanded && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
          )}
        </div>
        <button className="flex-shrink-0 text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* 확장된 내용 */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* 설명 */}
          {item.description && (
            <div className="mt-4">
              <p className="text-sm text-gray-700">{item.description}</p>
            </div>
          )}

          {/* 코드 예시 */}
          {(item.code_example || item.anti_pattern) && (
            <div className="mt-4 space-y-3">
              {item.code_example && (
                <CodeBlock code={item.code_example} title="올바른 예시" type="good" />
              )}
              {item.anti_pattern && (
                <CodeBlock code={item.anti_pattern} title="잘못된 예시" type="bad" />
              )}
            </div>
          )}

          {/* 연결된 에러 패턴 */}
          {item.related_error_pattern_ids && item.related_error_pattern_ids.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1 text-yellow-500" />
                관련 에러 패턴
              </h4>
              <div className="flex flex-wrap gap-2">
                {item.related_error_pattern_ids.map((patternId) => (
                  <Link
                    key={patternId}
                    href={`/error-patterns/${patternId}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
                  >
                    에러 패턴 #{patternId}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 키워드 */}
          {item.keywords && item.keywords.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-1">
                {item.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                  >
                    #{keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChecklistDetailPage() {
  const params = useParams();
  const [checklist, setChecklist] = useState<ChecklistWithItems | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChecklist() {
      if (!params.id) return;

      setLoading(true);
      try {
        const response = await getChecklistById(Number(params.id));
        if (response.success && response.data) {
          setChecklist(response.data);
        }
      } catch (error) {
        console.error('Error loading checklist:', error);
      } finally {
        setLoading(false);
      }
    }

    loadChecklist();
  }, [params.id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!checklist) {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">체크리스트를 찾을 수 없습니다</h3>
            <Link href="/debugging-checklists" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeft className="w-4 h-4 mr-1" />
              목록으로 돌아가기
            </Link>
          </div>
        </main>
      </>
    );
  }

  const config = categoryConfig[checklist.category] || categoryConfig.api;
  const CategoryIcon = config.icon;

  // 심각도별 아이템 수 계산
  const severityCounts = checklist.items.reduce(
    (acc, item) => {
      acc[item.severity] = (acc[item.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 뒤로가기 */}
        <Link
          href="/debugging-checklists"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          체크리스트 목록
        </Link>

        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${config.bgColor} ${config.color}`}>
                  <CategoryIcon className="w-4 h-4 mr-1" />
                  {checklist.category.toUpperCase()}
                </span>
                <span className="text-sm text-gray-500">v{checklist.version}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{checklist.title}</h1>
              {checklist.description && (
                <p className="mt-2 text-gray-600">{checklist.description}</p>
              )}
            </div>
          </div>

          {/* 통계 */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{checklist.items.length}</div>
                <div className="text-sm text-gray-500">전체 항목</div>
              </div>
              {severityCounts.critical > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{severityCounts.critical}</div>
                  <div className="text-sm text-gray-500">Critical</div>
                </div>
              )}
              {severityCounts.high > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{severityCounts.high}</div>
                  <div className="text-sm text-gray-500">High</div>
                </div>
              )}
              {(severityCounts.medium > 0 || severityCounts.low > 0) && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {(severityCounts.medium || 0) + (severityCounts.low || 0)}
                  </div>
                  <div className="text-sm text-gray-500">Medium/Low</div>
                </div>
              )}
            </div>
          </div>

          {/* 적용 프로젝트 */}
          {checklist.applicable_projects && checklist.applicable_projects.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-500 mb-2">적용 프로젝트</div>
              <div className="flex flex-wrap gap-2">
                {checklist.applicable_projects.map((project) => (
                  <span
                    key={project}
                    className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700"
                  >
                    {project}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 체크리스트 아이템 */}
        <div className="space-y-4">
          {checklist.items.map((item, index) => (
            <ChecklistItemCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </main>
    </>
  );
}
