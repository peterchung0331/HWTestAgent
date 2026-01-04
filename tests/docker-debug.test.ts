import { test, expect } from '@playwright/test';

/**
 * Docker 환경 디버깅 테스트
 * Network Error 원인 파악 및 수정
 */

const HUBMANAGER_URL = 'http://localhost:4290';

test.describe('Docker HubManager 디버깅', () => {
  test('허브 선택 페이지 네트워크 요청 모니터링', async ({ page }) => {
    // 네트워크 요청 모니터링
    const failedRequests: string[] = [];
    const successRequests: string[] = [];

    page.on('requestfailed', request => {
      failedRequests.push(`❌ FAILED: ${request.method()} ${request.url()}`);
      console.log(`❌ Request failed: ${request.url()}`);
      console.log(`   Failure: ${request.failure()?.errorText}`);
    });

    page.on('response', response => {
      const status = response.status();
      const url = response.url();

      if (status >= 400) {
        failedRequests.push(`❌ ERROR ${status}: ${url}`);
        console.log(`❌ Response error ${status}: ${url}`);
      } else {
        successRequests.push(`✅ OK ${status}: ${url}`);
      }
    });

    // 콘솔 에러 모니터링
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });

    console.log('\n🔍 Step 1: 허브 선택 페이지 접속');

    try {
      await page.goto(`${HUBMANAGER_URL}/hubs`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      console.log('✅ 페이지 로드 완료');

      // 스크린샷 저장
      await page.screenshot({
        path: '/home/peterchung/HWTestAgent/test-results/docker-debug-1-initial.png',
        fullPage: true
      });

    } catch (error) {
      console.log(`⚠️ 페이지 로드 중 타임아웃: ${error}`);

      await page.screenshot({
        path: '/home/peterchung/HWTestAgent/test-results/docker-debug-1-timeout.png',
        fullPage: true
      });
    }

    // 5초 대기 (추가 요청 확인)
    await page.waitForTimeout(5000);

    console.log('\n📊 네트워크 요청 결과:');
    console.log(`✅ 성공: ${successRequests.length}개`);
    console.log(`❌ 실패: ${failedRequests.length}개`);

    if (failedRequests.length > 0) {
      console.log('\n❌ 실패한 요청들:');
      failedRequests.forEach(req => console.log(`  ${req}`));
    }

    // 페이지 HTML 확인
    const html = await page.content();
    console.log('\n📄 페이지 타이틀:', await page.title());

    // Network Error 텍스트 확인
    const hasNetworkError = await page.locator('text=Network Error').count() > 0;
    console.log(`\n🔍 "Network Error" 표시: ${hasNetworkError ? '있음' : '없음'}`);

    if (hasNetworkError) {
      console.log('⚠️ Network Error가 발생했습니다. API 요청 실패로 추정됩니다.');
    }

    // API 엔드포인트 직접 테스트
    console.log('\n🔍 Step 2: API 엔드포인트 직접 테스트');

    try {
      const response = await page.request.get(`${HUBMANAGER_URL}/api/hubs`);
      console.log(`✅ GET /api/hubs: ${response.status()}`);

      if (response.ok()) {
        const data = await response.json();
        console.log(`✅ 응답 데이터:`, JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.log(`❌ GET /api/hubs 실패: ${error}`);
    }

    // 최종 스크린샷
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/docker-debug-2-final.png',
      fullPage: true
    });

    console.log('\n✅ 디버깅 테스트 완료');
  });
});
