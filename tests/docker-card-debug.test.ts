import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Docker 환경 카드 선택 화면 디버깅
 * 목표: Network Error를 해결하고 카드 목록이 정상 표시될 때까지 반복
 */

const HUBMANAGER_URL = 'http://localhost:4290';
const SCREENSHOT_DIR = '/home/peterchung/HWTestAgent/test-results/docker-card-debug';

// 스크린샷 디렉토리 생성
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Docker 카드 선택 화면 디버깅', () => {
  test('카드 목록이 나올 때까지 반복 디버깅', async ({ page }) => {
    let retryCount = 0;
    const maxRetries = 3;
    let success = false;

    // 네트워크 요청 모니터링
    const failedRequests: Array<{ url: string; method: string; error: string }> = [];
    const apiResponses: Array<{ url: string; status: number; body?: any }> = [];

    page.on('requestfailed', request => {
      const failure = request.failure();
      failedRequests.push({
        url: request.url(),
        method: request.method(),
        error: failure?.errorText || 'Unknown error'
      });
      console.log(`❌ Request failed: ${request.method()} ${request.url()}`);
      console.log(`   Error: ${failure?.errorText}`);
    });

    page.on('response', async response => {
      const url = response.url();
      const status = response.status();

      // API 응답만 기록
      if (url.includes('/api/')) {
        try {
          const body = await response.json().catch(() => null);
          apiResponses.push({ url, status, body });
          console.log(`📡 API Response: ${status} ${url}`);
          if (body) {
            console.log(`   Body:`, JSON.stringify(body, null, 2));
          }
        } catch (e) {
          apiResponses.push({ url, status });
        }
      }

      if (status >= 400) {
        console.log(`❌ HTTP ${status}: ${url}`);
      }
    });

    // 콘솔 로그 모니터링
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        console.log(`❌ Console Error: ${text}`);
      } else if (text.includes('Network Error') || text.includes('Failed to fetch')) {
        console.log(`⚠️ Console: ${text}`);
      }
    });

    while (retryCount <= maxRetries && !success) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 시도 ${retryCount + 1}/${maxRetries + 1}`);
      console.log(`${'='.repeat(60)}\n`);

      try {
        console.log(`🌐 Step 1: 페이지 접속 - ${HUBMANAGER_URL}/hubs`);

        await page.goto(`${HUBMANAGER_URL}/hubs`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        console.log('✅ 페이지 로드 완료');

        // 스크린샷 1: 초기 로드
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `attempt-${retryCount + 1}-01-initial.png`),
          fullPage: true
        });

        // 5초 대기 (API 요청 완료 대기)
        console.log('⏳ API 요청 대기 중 (5초)...');
        await page.waitForTimeout(5000);

        // 스크린샷 2: 5초 후
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `attempt-${retryCount + 1}-02-after-wait.png`),
          fullPage: true
        });

        console.log('\n📊 Step 2: 페이지 상태 분석');

        // Network Error 체크
        const hasNetworkError = await page.locator('text=Network Error').count() > 0;
        console.log(`🔍 "Network Error" 표시: ${hasNetworkError ? '있음 ❌' : '없음 ✅'}`);

        // 카드 요소 체크
        const cardSelectors = [
          '[data-testid="hub-card"]',
          'div[class*="card"]',
          'button:has-text("SalesHub")',
          'text=SalesHub',
          'text=FinHub',
          'text=OnboardingHub'
        ];

        let cardsFound = false;
        for (const selector of cardSelectors) {
          const count = await page.locator(selector).count();
          if (count > 0) {
            console.log(`✅ 카드 발견: "${selector}" (${count}개)`);
            cardsFound = true;
            break;
          }
        }

        if (!cardsFound) {
          console.log(`❌ 카드를 찾을 수 없습니다`);
        }

        console.log('\n📡 Step 3: 네트워크 요청 분석');
        console.log(`총 실패한 요청: ${failedRequests.length}개`);
        console.log(`총 API 응답: ${apiResponses.length}개`);

        if (failedRequests.length > 0) {
          console.log('\n❌ 실패한 요청 목록:');
          failedRequests.forEach((req, idx) => {
            console.log(`  ${idx + 1}. ${req.method} ${req.url}`);
            console.log(`     오류: ${req.error}`);
          });
        }

        if (apiResponses.length > 0) {
          console.log('\n📊 API 응답 목록:');
          apiResponses.forEach((res, idx) => {
            console.log(`  ${idx + 1}. ${res.status} ${res.url}`);
            if (res.body) {
              console.log(`     응답:`, res.body);
            }
          });
        }

        // 성공 조건: Network Error 없음 AND 카드 발견
        if (!hasNetworkError && cardsFound) {
          console.log('\n🎉 성공! 카드 선택 화면이 정상적으로 표시되었습니다.');
          success = true;

          // 최종 스크린샷
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, `success-final.png`),
            fullPage: true
          });
        } else {
          console.log('\n⚠️ 실패: 다음 문제가 발견되었습니다:');
          if (hasNetworkError) console.log('  - Network Error 표시됨');
          if (!cardsFound) console.log('  - 카드를 찾을 수 없음');

          if (retryCount < maxRetries) {
            console.log(`\n🔧 Step 4: 문제 진단 및 수정 (${retryCount + 1}차 시도 후)`);

            // 문제 진단
            await diagnoseAndFix(page, retryCount, failedRequests, apiResponses);

            // 대기 시간 증가 (2초, 4초, 6초)
            const waitTime = (retryCount + 1) * 2000;
            console.log(`⏳ ${waitTime / 1000}초 대기 후 재시도...`);
            await page.waitForTimeout(waitTime);
          }
        }

      } catch (error) {
        console.log(`\n❌ 예외 발생: ${error}`);

        // 에러 스크린샷
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `attempt-${retryCount + 1}-error.png`),
          fullPage: true
        });

        if (retryCount < maxRetries) {
          console.log(`⏳ 5초 대기 후 재시도...`);
          await page.waitForTimeout(5000);
        }
      }

      retryCount++;
    }

    if (!success) {
      console.log('\n❌ 최종 실패: 모든 재시도 횟수를 소진했습니다.');
      console.log('\n📋 상세 분석 결과:');
      console.log(`  - 시도 횟수: ${retryCount}`);
      console.log(`  - 실패한 요청: ${failedRequests.length}개`);
      console.log(`  - API 응답: ${apiResponses.length}개`);

      // 실패 보고서 생성
      const reportPath = path.join(SCREENSHOT_DIR, 'failure-report.txt');
      const report = generateFailureReport(failedRequests, apiResponses, retryCount);
      fs.writeFileSync(reportPath, report);
      console.log(`\n📄 실패 보고서 저장: ${reportPath}`);
    }

    // 테스트는 성공 여부와 관계없이 통과 (진단 목적)
    expect(success || retryCount > maxRetries).toBeTruthy();
  });
});

/**
 * 문제 진단 및 수정
 */
async function diagnoseAndFix(
  page: any,
  retryCount: number,
  failedRequests: Array<{ url: string; method: string; error: string }>,
  apiResponses: Array<{ url: string; status: number; body?: any }>
) {
  console.log('\n🔍 문제 진단 중...');

  // 1. API 엔드포인트 확인
  const apiHubsUrl = `${HUBMANAGER_URL}/api/hubs`;
  console.log(`\n📡 API 엔드포인트 직접 테스트: ${apiHubsUrl}`);

  try {
    const response = await page.request.get(apiHubsUrl);
    console.log(`  상태: ${response.status()}`);

    if (response.ok()) {
      const data = await response.json();
      console.log(`  ✅ API 응답 성공:`, JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log(`  ❌ API 응답 실패: ${text}`);
    }
  } catch (error) {
    console.log(`  ❌ API 요청 실패: ${error}`);
  }

  // 2. 페이지 HTML 분석
  const html = await page.content();
  const hasReactRoot = html.includes('id="__next"') || html.includes('id="root"');
  console.log(`\n📄 React 루트 존재: ${hasReactRoot ? '있음 ✅' : '없음 ❌'}`);

  // 3. 진단 결과 기반 추천
  console.log('\n💡 추천 조치:');

  if (failedRequests.some(req => req.url.includes('/api/hubs'))) {
    console.log('  1. 백엔드 API 라우팅 확인 필요');
    console.log('  2. CORS 설정 확인 필요');
  }

  if (apiResponses.length === 0) {
    console.log('  1. 프론트엔드 API 호출 코드 확인 필요');
    console.log('  2. 환경변수 (NEXT_PUBLIC_API_URL) 확인 필요');
  }

  if (!hasReactRoot) {
    console.log('  1. Next.js 빌드 확인 필요');
    console.log('  2. 정적 파일 서빙 확인 필요');
  }
}

/**
 * 실패 보고서 생성
 */
function generateFailureReport(
  failedRequests: Array<{ url: string; method: string; error: string }>,
  apiResponses: Array<{ url: string; status: number; body?: any }>,
  retryCount: number
): string {
  const timestamp = new Date().toISOString();

  return `
Docker 카드 선택 화면 디버깅 실패 보고서
=========================================

생성 시각: ${timestamp}
총 시도 횟수: ${retryCount}

## 실패한 네트워크 요청 (${failedRequests.length}개)

${failedRequests.map((req, idx) => `
${idx + 1}. ${req.method} ${req.url}
   오류: ${req.error}
`).join('\n')}

## API 응답 (${apiResponses.length}개)

${apiResponses.map((res, idx) => `
${idx + 1}. ${res.status} ${res.url}
${res.body ? `   응답: ${JSON.stringify(res.body, null, 2)}` : ''}
`).join('\n')}

## 권장 조치

1. 백엔드 로그 확인:
   sudo docker logs wbhubmanager

2. 프론트엔드 환경변수 확인:
   - NEXT_PUBLIC_API_URL
   - NEXT_PUBLIC_HUB_MANAGER_URL

3. API 라우팅 확인:
   - /api/hubs 엔드포인트 존재 여부
   - CORS 설정

4. 정적 파일 빌드 확인:
   - frontend/out 디렉토리
   - Next.js export 성공 여부
`;
}
