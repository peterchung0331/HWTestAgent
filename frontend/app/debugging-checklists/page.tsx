'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { getChecklists, getChecklistCategories } from '@/lib/api';
import { ChecklistSummary, ChecklistCategory } from '@/lib/types';
import { CheckCircle2, AlertTriangle, Search, Filter, ChevronRight, Shield, Database, Globe, Server, Code, GitBranch } from 'lucide-react';

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

// 범위별 라벨
const scopeLabels: Record<string, string> = {
  implementation: '구현',
  debugging: '디버깅',
  both: '구현/디버깅',
};

export default function DebuggingChecklistsPage() {
  const [checklists, setChecklists] = useState<ChecklistSummary[]>([]);
  const [categories, setCategories] = useState<{ category: ChecklistCategory; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [checklistsRes, categoriesRes] = await Promise.all([
          getChecklists({
            category: selectedCategory as ChecklistCategory || undefined,
            query: searchQuery || undefined,
          }),
          getChecklistCategories(),
        ]);

        if (checklistsRes.success && checklistsRes.data) {
          setChecklists(checklistsRes.data);
        }
        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }
      } catch (error) {
        console.error('Error loading checklists:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedCategory, searchQuery]);

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">디버깅 체크리스트</h1>
          </div>
          <p className="mt-2 text-gray-600">
            구현/디버깅 시 참조할 수 있는 코드 컨벤션 및 체크리스트입니다. 에러 패턴 DB를 분석하여 생성되었습니다.
          </p>
        </div>

        {/* 필터 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 검색 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="체크리스트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 카테고리 필터 */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[160px]"
              >
                <option value="">모든 카테고리</option>
                {categories.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {cat.category.toUpperCase()} ({cat.count})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : checklists.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">체크리스트가 없습니다</h3>
            <p className="mt-1 text-gray-500">검색 조건을 변경해 보세요.</p>
          </div>
        ) : (
          /* 체크리스트 카드 그리드 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {checklists.map((checklist) => {
              const config = categoryConfig[checklist.category] || categoryConfig.api;
              const CategoryIcon = config.icon;

              return (
                <Link
                  key={checklist.id}
                  href={`/debugging-checklists/${checklist.id}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all group"
                >
                  {/* 카테고리 배지 및 범위 */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                      <CategoryIcon className="w-3 h-3 mr-1" />
                      {checklist.category.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {scopeLabels[checklist.scope]}
                    </span>
                  </div>

                  {/* 제목 */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {checklist.title}
                  </h3>

                  {/* 설명 */}
                  {checklist.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {checklist.description}
                    </p>
                  )}

                  {/* 통계 */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">
                        <span className="font-medium">{checklist.item_count}</span> 항목
                      </span>
                      {checklist.critical_count > 0 && (
                        <span className="flex items-center text-red-600">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {checklist.critical_count} critical
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>

                  {/* 적용 프로젝트 */}
                  {checklist.applicable_projects && checklist.applicable_projects.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {checklist.applicable_projects.slice(0, 3).map((project) => (
                        <span
                          key={project}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                        >
                          {project}
                        </span>
                      ))}
                      {checklist.applicable_projects.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{checklist.applicable_projects.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
