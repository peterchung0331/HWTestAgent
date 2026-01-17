'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { getChecklistsByCategory } from '@/lib/api';
import { ChecklistWithItems, ChecklistCategory } from '@/lib/types';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Shield,
  Database,
  Globe,
  Server,
  Code,
  GitBranch,
  ChevronRight,
} from 'lucide-react';

// 카테고리별 색상 및 아이콘 매핑
const categoryConfig: Record<ChecklistCategory, { color: string; bgColor: string; icon: typeof Shield; label: string }> = {
  sso: { color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Shield, label: 'SSO / 인증' },
  docker: { color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Server, label: 'Docker / 컨테이너' },
  database: { color: 'text-green-700', bgColor: 'bg-green-100', icon: Database, label: '데이터베이스' },
  nginx: { color: 'text-orange-700', bgColor: 'bg-orange-100', icon: Globe, label: 'Nginx / 프록시' },
  api: { color: 'text-cyan-700', bgColor: 'bg-cyan-100', icon: Code, label: 'API' },
  build: { color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Code, label: '빌드' },
  git: { color: 'text-red-700', bgColor: 'bg-red-100', icon: GitBranch, label: 'Git' },
};

// 심각도별 스타일
const severityConfig = {
  critical: { color: 'text-red-700', bgColor: 'bg-red-100' },
  high: { color: 'text-orange-700', bgColor: 'bg-orange-100' },
  medium: { color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  low: { color: 'text-green-700', bgColor: 'bg-green-100' },
};

export default function CategoryChecklistsPage() {
  const params = useParams();
  const category = params.category as ChecklistCategory;
  const [checklists, setChecklists] = useState<ChecklistWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const config = categoryConfig[category] || categoryConfig.api;
  const CategoryIcon = config.icon;

  useEffect(() => {
    async function loadChecklists() {
      if (!category) return;

      setLoading(true);
      try {
        const response = await getChecklistsByCategory(category);
        if (response.success && response.data) {
          setChecklists(response.data);
        }
      } catch (error) {
        console.error('Error loading checklists:', error);
      } finally {
        setLoading(false);
      }
    }

    loadChecklists();
  }, [category]);

  // 전체 아이템 수 계산
  const totalItems = checklists.reduce((sum, cl) => sum + cl.items.length, 0);
  const criticalItems = checklists.reduce(
    (sum, cl) => sum + cl.items.filter((item) => item.severity === 'critical').length,
    0
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
        <div className={`rounded-lg ${config.bgColor} p-6 mb-6`}>
          <div className="flex items-center gap-3">
            <CategoryIcon className={`w-10 h-10 ${config.color}`} />
            <div>
              <h1 className={`text-2xl font-bold ${config.color}`}>{config.label} 체크리스트</h1>
              <p className="text-gray-600 mt-1">
                {checklists.length}개 체크리스트 / {totalItems}개 항목
                {criticalItems > 0 && (
                  <span className="ml-2 text-red-600">
                    (Critical {criticalItems}개)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : checklists.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              이 카테고리에 체크리스트가 없습니다
            </h3>
          </div>
        ) : (
          /* 체크리스트 목록 */
          <div className="space-y-6">
            {checklists.map((checklist) => (
              <div
                key={checklist.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* 체크리스트 헤더 */}
                <Link
                  href={`/debugging-checklists/${checklist.id}`}
                  className="block p-4 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">{checklist.title}</h2>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                  {checklist.description && (
                    <p className="text-sm text-gray-600 mt-1">{checklist.description}</p>
                  )}
                </Link>

                {/* 아이템 목록 */}
                <div className="divide-y divide-gray-100">
                  {checklist.items.map((item, index) => {
                    const severity = severityConfig[item.severity];
                    return (
                      <div key={item.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-600 font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${severity.bgColor} ${severity.color}`}>
                                {item.severity}
                              </span>
                              <span className="text-sm font-medium text-gray-900">{item.title}</span>
                            </div>
                            {item.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</p>
                            )}
                          </div>
                          {item.related_error_pattern_ids && item.related_error_pattern_ids.length > 0 && (
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center text-xs text-yellow-600">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {item.related_error_pattern_ids.length}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
