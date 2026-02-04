'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { getTemplates } from '@/lib/api';
import { TestScriptTemplate, TemplateType } from '@/lib/types';
import { FileText, Filter, Code } from 'lucide-react';
import Link from 'next/link';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TestScriptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<TemplateType | ''>('');

  useEffect(() => {
    async function loadTemplates() {
      setLoading(true);
      try {
        const response = await getTemplates({
          type: selectedType || undefined,
        });

        if (response.success && response.data) {
          setTemplates(response.data);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, [selectedType]);

  const templateTypes: TemplateType[] = ['e2e', 'integration', 'unit'];

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">테스트 템플릿</h1>
          <p className="mt-2 text-gray-600">재사용 가능한 테스트 스크립트 템플릿</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="relative max-w-xs">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as TemplateType | '')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">모든 타입</option>
              {templateTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'e2e' ? 'E2E 테스트' :
                   type === 'integration' ? '통합 테스트' :
                   '단위 테스트'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">템플릿이 없습니다</h3>
            <p className="text-gray-500">필터 조건을 변경하거나 새 템플릿을 생성해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
              <div
                key={template.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Code className="w-5 h-5 text-blue-500" />
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        template.template_type === 'e2e' ? 'bg-purple-100 text-purple-800' :
                        template.template_type === 'integration' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {template.template_type === 'e2e' ? 'E2E' :
                         template.template_type === 'integration' ? 'Integration' :
                         'Unit'}
                      </span>
                    </div>
                    {template.success_rate && (
                      <span className="text-sm font-medium text-green-600">
                        {template.success_rate.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {template.template_name}
                  </h3>

                  {/* Description */}
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  {/* Variables */}
                  {Object.keys(template.variables).length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-gray-700 mb-2">필요한 변수:</h4>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(template.variables).slice(0, 3).map(variable => (
                          <span
                            key={variable}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 font-mono"
                          >
                            {variable}
                          </span>
                        ))}
                        {Object.keys(template.variables).length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{Object.keys(template.variables).length - 3}개
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {template.tags && template.tags.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
                    <span>{template.times_used}회 사용</span>
                    {template.average_execution_time_seconds && (
                      <span>평균 {template.average_execution_time_seconds}s</span>
                    )}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <button
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                    onClick={() => {
                      // TODO: Implement template generation modal
                      alert(`템플릿 생성 기능은 곧 추가됩니다. Template ID: ${template.id}`);
                    }}
                  >
                    스크립트 생성
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
