'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { getErrorPatterns } from '@/lib/api';
import { ErrorPattern, ErrorCategory } from '@/lib/types';
import { AlertTriangle, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function ErrorPatternsPage() {
  const [patterns, setPatterns] = useState<ErrorPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ErrorCategory | ''>('');

  useEffect(() => {
    async function loadPatterns() {
      setLoading(true);
      try {
        const response = await getErrorPatterns({
          limit: 100,
          project: selectedProject || undefined,
          category: selectedCategory || undefined,
          query: searchQuery || undefined,
        });

        if (response.success && response.data) {
          setPatterns(response.data);
        }
      } catch (error) {
        console.error('Failed to load error patterns:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPatterns();
  }, [searchQuery, selectedProject, selectedCategory]);

  const projects = Array.from(new Set(patterns.map(p => p.project_name)));
  const categories: ErrorCategory[] = ['TIMEOUT', 'DATABASE', 'AUTH', 'NETWORK', 'VALIDATION', 'RUNTIME', 'API', 'UNKNOWN'];

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">에러 패턴</h1>
          <p className="mt-2 text-gray-600">시스템에서 발생한 에러 패턴 및 해결책</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="에러 메시지 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Project Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">모든 프로젝트</option>
                {projects.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ErrorCategory | '')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">모든 카테고리</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Patterns List */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : patterns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">에러 패턴이 없습니다</h3>
            <p className="text-gray-500">필터 조건을 변경해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {patterns.map(pattern => (
              <Link
                key={pattern.id}
                href={`/error-patterns/${pattern.id}`}
                className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                        pattern.error_category === 'TIMEOUT' ? 'bg-yellow-100 text-yellow-800' :
                        pattern.error_category === 'DATABASE' ? 'bg-purple-100 text-purple-800' :
                        pattern.error_category === 'AUTH' ? 'bg-red-100 text-red-800' :
                        pattern.error_category === 'NETWORK' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {pattern.error_category}
                      </span>
                      <span className="text-sm text-gray-500">{pattern.project_name}</span>
                      {pattern.auto_fixed && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          자동 수정됨
                        </span>
                      )}
                    </div>

                    {/* Error Message */}
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {pattern.error_message}
                    </h3>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>발생 {pattern.occurrence_count}회</span>
                      <span>·</span>
                      <span>최초: {new Date(pattern.first_seen).toLocaleDateString('ko-KR')}</span>
                      <span>·</span>
                      <span>최근: {new Date(pattern.last_seen).toLocaleString('ko-KR')}</span>
                      {pattern.confidence_score && (
                        <>
                          <span>·</span>
                          <span>신뢰도: {(pattern.confidence_score * 100).toFixed(0)}%</span>
                        </>
                      )}
                    </div>

                    {/* Additional Info */}
                    {(pattern.status_code || pattern.method || pattern.endpoint) && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        {pattern.status_code && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded">
                            {pattern.status_code}
                          </span>
                        )}
                        {pattern.method && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded">
                            {pattern.method}
                          </span>
                        )}
                        {pattern.endpoint && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded truncate max-w-xs">
                            {pattern.endpoint}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="ml-4">
                    <AlertTriangle className="w-6 h-6 text-orange-500" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
