'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { getTestResults, getTestStatistics } from '@/lib/api';
import { TestRun, TestStatistics } from '@/lib/types';
import { CheckCircle2, XCircle, Minus, Globe } from 'lucide-react';

const HUBS = ['WBHubManager', 'WBSalesHub', 'WBFinHub', 'WBOnboardingHub'] as const;

interface HubStatus {
  hub: string;
  latestRun?: TestRun;
  stats?: TestStatistics;
}

export default function CrossHubPage() {
  const [hubStatuses, setHubStatuses] = useState<HubStatus[]>([]);
  const [allRecent, setAllRecent] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 전체 최근 결과
        const recentRes = await getTestResults(50);
        const allRuns = recentRes.success && recentRes.data ? recentRes.data : [];
        setAllRecent(allRuns);

        // 허브별 상태 집계
        const statuses: HubStatus[] = await Promise.all(
          HUBS.map(async (hub) => {
            const latestRun = allRuns.find(r => r.project_name === hub);
            let stats: TestStatistics | undefined;
            try {
              const statsRes = await getTestStatistics(hub, 30);
              if (statsRes.success && statsRes.data) {
                stats = statsRes.data;
              }
            } catch { /* stats 없으면 무시 */ }
            return { hub, latestRun, stats };
          })
        );

        setHubStatuses(statuses);
      } catch (error) {
        console.error('Failed to load cross-hub data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  // 전체 통계
  const totalRuns = allRecent.length;
  const totalPassed = allRecent.filter(r => r.status === 'PASSED').length;
  const totalFailed = allRecent.filter(r => r.status === 'FAILED').length;
  const overallRate = totalRuns > 0 ? Math.round((totalPassed / totalRuns) * 100) : 0;

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cross-Hub 테스트 개요</h1>
          <p className="mt-2 text-gray-600">전체 허브의 테스트 현황을 한눈에 확인합니다.</p>
        </div>

        {/* 전체 요약 */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">전체 성공률 (최근 50개)</p>
              <p className={`mt-2 text-4xl font-bold ${
                overallRate >= 80 ? 'text-green-600' :
                overallRate >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {overallRate}%
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {totalPassed} passed / {totalFailed} failed / {totalRuns} total
              </p>
            </div>
            <Globe className="w-16 h-16 text-blue-500" />
          </div>
        </div>

        {/* 허브별 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {hubStatuses.map(({ hub, latestRun, stats }) => {
            const status = latestRun?.status;
            const borderColor = status === 'PASSED' ? 'border-green-400' :
                               status === 'FAILED' ? 'border-red-400' : 'border-gray-300';
            const bgColor = status === 'PASSED' ? 'bg-green-50' :
                           status === 'FAILED' ? 'bg-red-50' : 'bg-gray-50';

            return (
              <div key={hub} className={`rounded-lg shadow-sm p-5 border-2 ${borderColor} ${bgColor}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {hub.replace('WB', '')}
                  </h3>
                  {status === 'PASSED' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : status === 'FAILED' ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <Minus className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                {latestRun ? (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500">
                      마지막 실행: {new Date(latestRun.started_at).toLocaleString('ko-KR')}
                    </div>
                    <div className="text-xs">
                      <span className="text-green-600 font-medium">{latestRun.passed_steps}</span>
                      {' / '}
                      <span className="text-gray-600">{latestRun.total_steps} steps</span>
                      {latestRun.failed_steps > 0 && (
                        <span className="text-red-600 ml-1">({latestRun.failed_steps} failed)</span>
                      )}
                    </div>
                    {latestRun.duration_ms && (
                      <div className="text-xs text-gray-500">
                        {(latestRun.duration_ms / 1000).toFixed(1)}s
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">테스트 기록 없음</div>
                )}

                {stats && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      30일: {stats.total_runs}회 실행, 성공률 {stats.success_rate?.toFixed(0) || 0}%
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 최근 전체 테스트 타임라인 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">최근 테스트 타임라인</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">허브</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시나리오</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Steps</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">소요</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시간</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allRecent.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      테스트 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  allRecent.slice(0, 20).map(run => (
                    <tr key={run.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {run.project_name.replace('WB', '')}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                        {run.scenario_name}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          run.status === 'PASSED' ? 'bg-green-100 text-green-800' :
                          run.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {run.status === 'PASSED' ? <CheckCircle2 className="w-3 h-3 mr-1" /> :
                           run.status === 'FAILED' ? <XCircle className="w-3 h-3 mr-1" /> : null}
                          {run.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                        <span className="text-green-600">{run.passed_steps}</span>/{run.total_steps}
                        {run.failed_steps > 0 && (
                          <span className="text-red-600 ml-1">({run.failed_steps}F)</span>
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                        {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '-'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(run.started_at).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
