/**
 * 세일즈허브 클릭 시 동작 디버깅
 * - /hubs 페이지에서 세일즈허브 클릭
 * - 리다이렉트 흐름 추적
 * - 최종 도착 URL 확인
 */

import { test, expect } from '@playwright/test';

test('세일즈허브 클릭 시 동작 확인', async ({ page }) => {
  console.log('\n🔍 세일즈허브 클릭 테스트 시작...\n');

  // 네트워크 요청 모니터링
  const requests: { method: string; url: string; status: number | null }[] = [];

  page.on('request', request => {
    console.log(`📤 Request: ${request.method()} ${request.url()}`);
  });

  page.on('response', async response => {
    const url = response.url();
    const status = response.status();
    requests.push({ method: response.request().method(), url, status });

    console.log(`📥 Response: ${status} ${url}`);

    // API 응답 내용 출력
    if (url.includes('/api/')) {
      try {
        const text = await response.text();
        console.log(`   Body: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
      } catch (e) {
        // ignore
      }
    }
  });

  // 콘솔 로그 캡처
  page.on('console', msg => {
    console.log(`🖥️  Console [${msg.type()}]: ${msg.text()}`);
  });

  // 1. /hubs 페이지 접속
  console.log('\n📍 Step 1: /hubs 페이지 접속');
  await page.goto('https://workhub.biz/hubs/', { waitUntil: 'networkidle' });
  console.log(`   현재 URL: ${page.url()}\n`);

  // 2. 세일즈허브 카드 찾기
  console.log('📍 Step 2: 세일즈허브 카드 찾기');
  const saleshubCard = page.locator('text=Sales Hub').first();
  const isVisible = await saleshubCard.isVisible();
  console.log(`   세일즈허브 카드 표시: ${isVisible}\n`);

  if (!isVisible) {
    console.log('❌ 세일즈허브 카드를 찾을 수 없습니다.');
    await page.screenshot({ path: 'test-results/saleshub-not-found.png', fullPage: true });
    return;
  }

  // 3. 세일즈허브 클릭
  console.log('📍 Step 3: 세일즈허브 클릭');
  await saleshubCard.click();

  // 네비게이션 대기 (최대 10초)
  console.log('   네비게이션 대기 중...');
  await page.waitForTimeout(5000);

  // 4. 최종 URL 확인
  const finalUrl = page.url();
  console.log(`\n📍 Step 4: 최종 도착 URL`);
  console.log(`   ${finalUrl}\n`);

  // 5. 쿠키 확인
  const cookies = await page.context().cookies();
  console.log('🍪 쿠키 목록:');
  cookies.forEach(cookie => {
    console.log(`   ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
  });

  // 6. 요청 요약
  console.log('\n📊 API 요청 요약:');
  const authRequests = requests.filter(r => r.url.includes('/auth/'));
  console.log(`   인증 관련 요청: ${authRequests.length}개`);
  authRequests.forEach(r => {
    console.log(`   - ${r.method} ${r.url} (${r.status})`);
  });

  // 스크린샷 저장
  await page.screenshot({ path: 'test-results/saleshub-click-final.png', fullPage: true });
  console.log('\n📸 스크린샷 저장: test-results/saleshub-click-final.png');
});
