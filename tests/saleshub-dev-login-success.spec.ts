import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('SalesHub Dev Login Success', () => {
  test.setTimeout(60000);

  test('SalesHub 개발 모드 로그인 성공 확인', async ({ page }) => {
    const screenshotsDir = path.join(__dirname, '../test-results/saleshub-dev-login-screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    console.log('\n🚀 SalesHub 개발 모드 로그인 테스트 시작...\n');

    // 1. 로그인 페이지 접속
    console.log('📊 Step 1: 로그인 페이지 접속');
    await page.goto('http://localhost:3010/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotsDir, '01-login-page.png'), fullPage: true });

    // 2. 개발 모드 로그인 버튼 클릭
    console.log('📊 Step 2: 개발 모드 로그인 버튼 클릭');
    const devLoginButton = page.locator('button:has-text("개발 모드 로그인")');
    await expect(devLoginButton).toBeVisible();
    await devLoginButton.click();

    // 3. 대시보드로 리다이렉트 대기
    console.log('📊 Step 3: 대시보드 로딩 대기');
    await page.waitForURL('http://localhost:3010/', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotsDir, '02-dashboard.png'), fullPage: true });

    const currentURL = page.url();
    console.log(`📍 Current URL: ${currentURL}`);

    // 4. 대시보드 요소 확인
    console.log('\n📊 Step 4: 대시보드 요소 확인');

    // 페이지 제목 확인
    const title = await page.title();
    console.log(`  - Page title: "${title}"`);

    // 대시보드 특징적인 요소 확인
    const hasCustomerSection = await page.locator('text=고객').isVisible().catch(() => false);
    const hasMeetingSection = await page.locator('text=미팅').isVisible().catch(() => false);
    const hasNavigation = await page.locator('nav').isVisible().catch(() => false);

    console.log(`  - Has customer section: ${hasCustomerSection}`);
    console.log(`  - Has meeting section: ${hasMeetingSection}`);
    console.log(`  - Has navigation: ${hasNavigation}`);

    // 5. 인증 상태 확인
    console.log('\n📊 Step 5: 인증 상태 확인');
    const authResponse = await page.goto('http://localhost:4010/auth/me', { waitUntil: 'networkidle' });
    const authData = await authResponse?.json();

    console.log('Auth API Response:', JSON.stringify(authData, null, 2));

    if (authData.success && authData.isAuthenticated) {
      console.log('\n✅ 인증 성공!');
      console.log(`  - User: ${authData.user.name} (${authData.user.email})`);
      console.log(`  - Role: ${authData.user.role}`);
      console.log(`  - Status: ${authData.user.status}`);
    } else {
      console.log('\n❌ 인증 실패');
    }

    // 6. 최종 검증
    console.log('\n📊 Step 6: 최종 검증');
    expect(currentURL).toBe('http://localhost:3010/');
    expect(authData.success).toBe(true);
    expect(authData.isAuthenticated).toBe(true);
    expect(authData.user.status).toBe('active');

    console.log('\n✅ SalesHub 개발 모드 로그인 성공!\n');
    console.log(`스크린샷 저장 위치: ${screenshotsDir}`);
  });
});
