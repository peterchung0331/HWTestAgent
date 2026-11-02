import { test, expect } from '@playwright/test';

/**
 * WBHubManager 프로덕션 E2E 테스트
 * 목적: localhost:4090 하드코딩 제거 확인
 * 대상: http://workhub.biz
 */

test.describe('WBHubManager 프로덕션 E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 네트워크 요청 모니터링
    page.on('request', request => {
      const url = request.url();
      if (url.includes('localhost:4090')) {
        console.error('❌ localhost:4090 하드코딩 발견:', url);
      }
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('콘솔 에러:', msg.text());
      }
    });

    page.on('requestfailed', request => {
      console.log('❌ 요청 실패:', request.url(), request.failure()?.errorText);
    });
  });

  test('허브 선택 페이지 렌더링 확인', async ({ page }) => {
    // 페이지 접속
    await page.goto('http://workhub.biz/hubs', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 스크린샷 저장
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/workhub-hubs-page.png',
      fullPage: true
    });

    // 페이지 타이틀 확인
    const title = await page.title();
    console.log('페이지 타이틀:', title);
    expect(title).toBeTruthy();

    // 허브 카드 확인
    const hubCards = page.locator('[data-testid^="hub-card-"], .hub-card, [class*="hub"], [class*="card"]');
    const count = await hubCards.count();
    console.log(`허브 카드 개수: ${count}`);

    // 최소 1개 이상의 허브 카드가 있어야 함
    expect(count).toBeGreaterThan(0);
  });

  test('API 요청에 localhost:4090 없음 확인', async ({ page }) => {
    const localhostRequests: string[] = [];

    // 모든 네트워크 요청 수집
    page.on('request', request => {
      const url = request.url();
      if (url.includes('localhost:4090')) {
        localhostRequests.push(url);
      }
    });

    // 페이지 접속
    await page.goto('http://workhub.biz/hubs', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 추가 대기 (비동기 요청 대기)
    await page.waitForTimeout(3000);

    // localhost:4090 요청이 없어야 함
    console.log('localhost:4090 요청 목록:', localhostRequests);
    expect(localhostRequests).toHaveLength(0);

    if (localhostRequests.length > 0) {
      throw new Error(`localhost:4090 하드코딩 발견: ${localhostRequests.join(', ')}`);
    }
  });

  test('메인 페이지 렌더링 확인', async ({ page }) => {
    // 메인 페이지 접속
    await page.goto('http://workhub.biz', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 스크린샷 저장
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/workhub-main-page.png',
      fullPage: true
    });

    // 페이지가 정상적으로 렌더링되었는지 확인
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(0);
  });

  test('Health check 엔드포인트 확인', async ({ request }) => {
    const response = await request.get('http://workhub.biz/api/health');

    console.log('Health check 상태:', response.status());
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    console.log('Health check 응답:', data);
    expect(data.status).toBe('ok');
  });
});
