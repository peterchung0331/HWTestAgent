import { test, expect } from '@playwright/test';
import { loginWithGoogle, getTestGoogleCredentials } from './helpers/google-oauth-helper';

test.describe('오라클 스테이징 - 세일즈허브 버튼 클릭 테스트', () => {
  test('허브 선택 화면에서 세일즈허브 버튼 클릭 가능 여부 확인', async ({ page }) => {
    const { email, password } = getTestGoogleCredentials();
    
    // 1. 로그인
    console.log('🔐 Google OAuth 로그인 시작...');
    await loginWithGoogle(page, {
      email,
      password,
      loginUrl: 'https://staging.workhub.biz',
      redirectPath: '/hubs'
    });
    
    // 2. 허브 선택 화면 확인
    await page.waitForURL('**/hubs', { timeout: 10000 });
    console.log('✅ 허브 선택 화면 도달');
    
    // 3. 세일즈허브 카드 찾기
    const salesHubCard = page.locator('text=WBSalesHub').locator('..');
    await expect(salesHubCard).toBeVisible({ timeout: 5000 });
    console.log('✅ 세일즈허브 카드 발견');
    
    // 4. 버튼 찾기
    const button = salesHubCard.locator('button:has-text("대시보드로 이동하기")');
    await expect(button).toBeVisible();
    console.log('✅ 버튼 발견');
    
    // 5. 버튼 상태 확인
    const isEnabled = await button.isEnabled();
    const isVisible = await button.isVisible();
    console.log(`📊 버튼 상태 - Enabled: ${isEnabled}, Visible: ${isVisible}`);
    
    // 6. 버튼 클릭 시도
    console.log('🖱️  버튼 클릭 시도...');
    await button.click();
    
    // 7. 세일즈허브 대시보드로 이동 확인
    await page.waitForURL('**/saleshub**', { timeout: 10000 });
    console.log('✅ 세일즈허브 대시보드로 이동 성공!');
    
    // 8. 스크린샷 저장
    await page.screenshot({ path: 'test-results/saleshub-dashboard-success.png', fullPage: true });
  });
});
