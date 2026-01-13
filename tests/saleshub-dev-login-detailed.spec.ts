import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('SalesHub Dev Login Detailed', () => {
  test.setTimeout(60000);

  test('SalesHub 개발 모드 로그인 상세 분석', async ({ page }) => {
    const screenshotsDir = path.join(__dirname, '../test-results/saleshub-dev-login-screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // 1. 로그인 페이지 접속
    console.log('\n📊 Step 1: 로그인 페이지 접속');
    await page.goto('http://localhost:3010/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotsDir, '01-login-page.png'), fullPage: true });

    // 2. 개발 모드 로그인 버튼 클릭
    console.log('📊 Step 2: 개발 모드 로그인 버튼 클릭');
    const devLoginButton = page.locator('button:has-text("개발 모드 로그인")');
    await expect(devLoginButton).toBeVisible();
    await devLoginButton.click();

    // 3. URL 변화 추적
    console.log('📊 Step 3: URL 변화 추적');
    await page.waitForTimeout(2000);

    const currentURL = page.url();
    console.log(`📍 Current URL: ${currentURL}`);
    await page.screenshot({ path: path.join(screenshotsDir, '02-after-dev-login.png'), fullPage: true });

    // 4. URL 파라미터 분석
    const url = new URL(currentURL);
    console.log('\n📊 URL 분석:');
    console.log(`  - Pathname: ${url.pathname}`);
    console.log(`  - Search params: ${url.search}`);

    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
      console.log(`  - ${key}: ${value.substring(0, 50)}...`);
    });

    // 5. 페이지 상태 분석
    console.log('\n📊 페이지 상태:');
    const hasError = url.searchParams.has('error');
    const hasAuth = url.searchParams.has('auth');
    const hasAccessToken = url.searchParams.has('accessToken');
    const hasRefreshToken = url.searchParams.has('refreshToken');

    console.log(`  - Has error: ${hasError}`);
    console.log(`  - Has auth: ${hasAuth}`);
    console.log(`  - Has accessToken: ${hasAccessToken}`);
    console.log(`  - Has refreshToken: ${hasRefreshToken}`);

    // 6. 대시보드 확인
    if (hasAuth && hasAccessToken) {
      console.log('\n✅ 토큰이 URL에 포함되어 있음');
      await page.waitForTimeout(3000);
      const finalURL = page.url();
      console.log(`📍 Final URL: ${finalURL}`);
      await page.screenshot({ path: path.join(screenshotsDir, '03-final-state.png'), fullPage: true });

      if (finalURL.includes('/login')) {
        console.log('⚠️  프론트엔드가 토큰을 처리하지 못함');
      } else {
        console.log('✅ 대시보드로 이동 성공');
      }
    } else if (hasError) {
      console.log(`\n❌ 에러 발생: ${url.searchParams.get('error')}`);
    } else {
      console.log('\n⚠️  예상치 못한 상태');
    }

    console.log(`\n스크린샷 저장 위치: ${screenshotsDir}`);
  });
});
