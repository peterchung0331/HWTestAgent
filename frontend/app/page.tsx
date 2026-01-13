'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { getTestResults, getErrorPatterns, getErrorPatternStats } from '@/lib/api';
import { TestRun, ErrorPattern, ErrorPatternStats } from '@/lib/types';
import { AlertTriangle, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function DashboardHome() {
  const [recentTests, setRecentTests] = useState<TestRun[]>([]);
  const [topErrors, setTopErrors] = useState<ErrorPattern[]>([]);
  const [stats, setStats] = useState<ErrorPatternStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [testsResponse, errorsResponse, statsResponse] = await Promise.all([
          getTestResults(10),
          getErrorPatterns({ limit: 10 }),
          getErrorPatternStats(),
        ]);

        if (testsResponse.success && testsResponse.data) {
          setRecentTests(testsResponse.data);
        }

        if (errorsResponse.success && errorsResponse.data) {
          setTopErrors(errorsResponse.data);
        }

        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  const passedTests = recentTests.filter(t => t.status === 'PASSED').length;
  const failedTests = recentTests.filter(t => t.status === 'FAILED').length;
  const successRate = recentTests.length > 0
    ? Math.round((passedTests / recentTests.length) * 100)
    : 0;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="mt-2 text-gray-600">테스트 자동화 및 에러 패턴 관리 시스템</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Test Success Rate */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">테스트 성공률</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{successRate}%</p>
                <p className="mt-1 text-sm text-gray-500">
                  최근 {recentTests.length}개 테스트
                </p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
          </div>

          {/* Total Error Patterns */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 에러 패턴</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats?.total_patterns || 0}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  해결됨: {stats?.resolved_count || 0}
                </p>
              </div>
              <AlertTriangle className="w-12 h-12 text-orange-500" />
            </div>
          </div>

          {/* Recent Test Runs */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">최근 테스트 실행</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{recentTests.length}</p>
                <p className="mt-1 text-sm text-gray-500">
                  실패: {failedTests}개
                </p>
              </div>
              <Clock className="w-12 h-12 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Recent Test Results */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">최근 테스트 결과</h2>
            <Link
              href="/test-results"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              전체 보기 →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    프로젝트
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    시나리오
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    소요 시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    실행 시간
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      테스트 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  recentTests.slice(0, 5).map(test => (
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {test.project_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {test.scenario_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          test.status === 'PASSED' ? 'bg-green-100 text-green-800' :
                          test.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {test.status === 'PASSED' ? <CheckCircle2 className="w-3 h-3 mr-1" /> :
                           test.status === 'FAILED' ? <XCircle className="w-3 h-3 mr-1" /> : null}
                          {test.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {test.duration_ms ? `${(test.duration_ms / 1000).toFixed(1)}s` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(test.started_at).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Error Patterns */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">주요 에러 패턴</h2>
            <Link
              href="/error-patterns"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              전체 보기 →
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {topErrors.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                에러 패턴이 없습니다.
              </div>
            ) : (
              topErrors.slice(0, 5).map(error => (
                <Link
                  key={error.id}
                  href={`/error-patterns/${error.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          {error.error_category}
                        </span>
                        <span className="text-xs text-gray-500">{error.project_name}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {error.error_message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        발생 {error.occurrence_count}회 · 최근: {new Date(error.last_seen).toLocaleString('ko-KR')}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center">
                      <TrendingUp className="w-5 h-5 text-red-500" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
