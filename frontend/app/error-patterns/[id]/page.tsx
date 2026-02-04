'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { getErrorPatternById } from '@/lib/api';
import { ErrorPattern, ErrorSolution } from '@/lib/types';
import { AlertTriangle, CheckCircle2, Clock, FileText, Code, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ErrorPatternDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string);

  const [pattern, setPattern] = useState<ErrorPattern | null>(null);
  const [solutions, setSolutions] = useState<ErrorSolution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPatternDetail() {
      if (isNaN(id)) return;

      setLoading(true);
      try {
        const response = await getErrorPatternById(id);
        if (response.success && response.data) {
          setPattern(response.data.pattern);
          setSolutions(response.data.solutions);
        }
      } catch (error) {
        console.error('Failed to load error pattern detail:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPatternDetail();
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-12 bg-gray-200 rounded w-3/4 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </main>
      </>
    );
  }

  if (!pattern) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">에러 패턴을 찾을 수 없습니다</h3>
            <Link href="/error-patterns" className="text-blue-600 hover:text-blue-700">
              목록으로 돌아가기
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li>
              <Link href="/error-patterns" className="text-gray-700 hover:text-blue-600">
                에러 패턴
              </Link>
            </li>
            <li>
              <span className="text-gray-400"> / </span>
            </li>
            <li className="text-gray-500">상세</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
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
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    자동 수정됨
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{pattern.error_message}</h1>
              <p className="text-sm text-gray-500">Error Hash: {pattern.error_hash}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600">발생 횟수</p>
              <p className="text-2xl font-bold text-gray-900">{pattern.occurrence_count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">최초 발생</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(pattern.first_seen).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">최근 발생</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(pattern.last_seen).toLocaleString('ko-KR')}
              </p>
            </div>
            {pattern.confidence_score && (
              <div>
                <p className="text-sm text-gray-600">신뢰도</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(pattern.confidence_score * 100).toFixed(0)}%
                </p>
              </div>
            )}
          </div>

          {/* Additional Info */}
          {(pattern.status_code || pattern.method || pattern.endpoint) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">요청 정보</h3>
              <div className="flex flex-wrap gap-2">
                {pattern.status_code && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Status:</span>
                    <span className="bg-gray-100 px-2 py-1 rounded text-sm font-medium">
                      {pattern.status_code}
                    </span>
                  </div>
                )}
                {pattern.method && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Method:</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                      {pattern.method}
                    </span>
                  </div>
                )}
                {pattern.endpoint && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Endpoint:</span>
                    <span className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                      {pattern.endpoint}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Solutions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <CheckCircle2 className="w-6 h-6 text-green-500 mr-2" />
            해결책 ({solutions.length})
          </h2>

          {solutions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>아직 등록된 해결책이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {solutions.map((solution, index) => (
                <div key={solution.id} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      #{index + 1} {solution.solution_title}
                    </h3>
                    {solution.success_rate && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        성공률 {solution.success_rate.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <p className="text-gray-700 mb-4">{solution.solution_description}</p>

                  {/* Steps */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      해결 단계
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                      {solution.solution_steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Files Modified */}
                  {solution.files_modified && solution.files_modified.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Code className="w-4 h-4 mr-1" />
                        수정된 파일
                      </h4>
                      <ul className="space-y-1">
                        {solution.files_modified.map((file, i) => (
                          <li key={i} className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
                            {file}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {solution.times_applied}회 적용됨
                    </span>
                    {solution.average_fix_time_minutes && (
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        평균 {solution.average_fix_time_minutes}분
                      </span>
                    )}
                  </div>

                  {/* Reference Docs */}
                  {solution.reference_docs && solution.reference_docs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">참고 문서</h4>
                      <ul className="space-y-1">
                        {solution.reference_docs.map((doc, i) => (
                          <li key={i}>
                            <a
                              href={doc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              {doc}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
