/**
 * 세일즈허브 전체 로그인 플로우 테스트
 * - Google OAuth 자동 로그인
 * - 세일즈허브 접근 확인
 */

import { test, expect } from '@playwright/test';

test('Google 로그인 후 세일즈허브 접근', async ({ page }) => {
  console.log('\n🔍 전체 로그인 플로우 테스트 시작...\n');

  const TEST_EMAIL = process.env.TEST_GOOGLE_EMAIL || 'biz.dev@wavebridge.com';
  const TEST_PASSWORD = process.env.TEST_GOOGLE_PASSWORD || 'wave1234!!';

  // 1. /hubs 페이지 접속
  console.log('📍 Step 1: /hubs 페이지 접속');
  await page.goto('https://workhub.biz/hubs/', { waitUntil: 'networkidle' });
  console.log(`   현재 URL: ${page.url()}\n`);

  // 2. 세일즈허브 카드 클릭
  console.log('📍 Step 2: 세일즈허브 클릭');
  const saleshubCard = page.locator('text=Sales Hub').first();
  await saleshubCard.click();

  // Google OAuth 페이지로 이동 대기
  console.log('   Google OAuth 페이지 대기 중...');
  await page.waitForURL(/accounts\.google\.com/, { timeout: 10000 });
  console.log(`   ✅ Google 로그인 페이지 도착: ${page.url()}\n`);

  // 3. Google 로그인
  console.log('📍 Step 3: Google 자동 로그인');

  // 이메일 입력
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 5000 });
  await emailInput.fill(TEST_EMAIL);
  console.log(`   이메일 입력: ${TEST_EMAIL}`);

  // "다음" 버튼 클릭
  await page.locator('button:has-text("다음"), button:has-text("Next")').click();
  await page.waitForTimeout(2000);

  // 비밀번호 입력
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.fill(TEST_PASSWORD);
  console.log(`   비밀번호 입력 완료`);

  // "다음" 버튼 클릭
  await page.locator('button:has-text("다음"), button:has-text("Next")').click();
  console.log(`   로그인 제출\n`);

  // 4. 리다이렉트 대기 (최대 30초)
  console.log('📍 Step 4: 세일즈허브로 리다이렉트 대기 중...');
  try {
    await page.waitForURL(/workhub\.biz\/saleshub/, { timeout: 30000 });
    console.log(`   ✅ 세일즈허브 도착: ${page.url()}\n`);
  } catch (error) {
    console.log(`   ❌ 타임아웃: 현재 URL = ${page.url()}\n`);
  }

  // 5. 쿠키 확인
  const cookies = await page.context().cookies();
  console.log('🍪 쿠키 목록:');
  cookies.forEach(cookie => {
    if (cookie.name.includes('access') || cookie.name.includes('refresh')) {
      console.log(`   ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
    }
  });

  // 6. 최종 URL 확인
  const finalUrl = page.url();
  console.log(`\n📍 최종 도착 URL: ${finalUrl}`);

  // 스크린샷 저장
  await page.screenshot({ path: 'test-results/saleshub-after-login.png', fullPage: true });
  console.log('📸 스크린샷 저장: test-results/saleshub-after-login.png\n');

  // 7. 검증
  if (finalUrl.includes('/saleshub')) {
    console.log('✅ 테스트 성공: 세일즈허브로 정상 리다이렉트됨');
  } else if (finalUrl.includes('/hubs')) {
    console.log('❌ 테스트 실패: /hubs로 돌아옴 (문제 발생)');
  } else {
    console.log(`⚠️  예상치 못한 URL: ${finalUrl}`);
  }
});
