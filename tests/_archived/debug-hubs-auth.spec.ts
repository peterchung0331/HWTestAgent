import { test, expect } from '@playwright/test';

test('Hubs 페이지 인증 문제 디버깅', async ({ page }) => {
  console.log('\n🔍 Hubs 페이지 접속 및 인증 확인...');

  // 네트워크 요청 모니터링
  const apiRequests: { url: string; status: number; method: string }[] = [];

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/') || url.includes('/auth/')) {
      const status = response.status();
      const method = response.request().method();
      apiRequests.push({ url, status, method });

      if (status >= 400) {
        console.log(`❌ ${method} ${url} - ${status}`);
        try {
          const body = await response.text();
          console.log(`   Response: ${body.substring(0, 200)}`);
        } catch (e) {
          // ignore
        }
      }
    }
  });

  // Hubs 페이지 접속
  await page.goto('http://workhub.biz/hubs');

  // 5초 대기
  await page.waitForTimeout(5000);

  // 현재 URL 확인
  const currentUrl = page.url();
  console.log('\n📍 현재 URL:', currentUrl);

  // 쿠키 확인
  const cookies = await page.context().cookies();
  console.log('\n🍪 쿠키 목록:');
  cookies.forEach(cookie => {
    console.log(`   ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
  });

  // 로컬스토리지 확인
  const localStorage = await page.evaluate(() => {
    const items: any = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) items[key] = window.localStorage.getItem(key);
    }
    return items;
  });
  console.log('\n💾 LocalStorage:', JSON.stringify(localStorage, null, 2));

  // API 요청 요약
  console.log('\n📊 API 요청 요약:');
  const authRequests = apiRequests.filter(r => r.url.includes('/auth'));
  console.log(`   인증 관련 요청: ${authRequests.length}개`);
  authRequests.forEach(r => {
    console.log(`   - ${r.method} ${r.url} (${r.status})`);
  });

  const failedRequests = apiRequests.filter(r => r.status >= 400);
  console.log(`   실패한 요청: ${failedRequests.length}개`);

  // 스크린샷
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/hubs-auth-debug.png',
    fullPage: true
  });

  console.log('\n📸 스크린샷 저장 완료');
});
