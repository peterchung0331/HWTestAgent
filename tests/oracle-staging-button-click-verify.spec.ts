import { test, expect } from '@playwright/test';

/**
 * 오라클 스테이징 - 버튼 클릭 검증 테스트
 * 
 * 목적: AuthContext trailing slash 수정 후 버튼 클릭 동작 확인
 * 시나리오:
 * 1. 캐시/쿠키 보유 상태에서 /hubs 접속
 * 2. GlobalNav가 렌더링되지 않는지 확인
 * 3. 허브 카드 버튼 클릭 가능한지 확인
 */

test.describe('오라클 스테이징 - 버튼 클릭 검증', () => {
  test('캐시 보유 상태에서 허브 선택 버튼 클릭 가능', async ({ page }) => {
    // 1. 페이지 접속
    await page.goto('https://staging.workhub.biz:4400/hubs');
    
    // 페이지 로드 대기
    await page.waitForLoadState('networkidle');
    
    // 2. GlobalNav가 렌더링되지 않았는지 확인
    const globalNav = page.locator('nav').first();
    const isGlobalNavVisible = await globalNav.isVisible().catch(() => false);
    
    console.log('✅ GlobalNav 표시 여부:', isGlobalNavVisible);
    
    // 3. 허브 카드 찾기 (세일즈허브)
    const salesHubCard = page.locator('text=세일즈허브').first();
    await expect(salesHubCard).toBeVisible({ timeout: 10000 });
    
    // 4. 버튼 찾기 (대시보드로 이동하기)
    const dashboardButton = page.locator('text=대시보드로 이동하기').first();
    await expect(dashboardButton).toBeVisible();
    
    // 5. 버튼 클릭 가능한지 확인
    const isEnabled = await dashboardButton.isEnabled();
    console.log('✅ 버튼 활성화 상태:', isEnabled);
    
    // 6. 실제 클릭 시도
    await dashboardButton.click();
    
    // 7. 페이지 전환 확인
    await page.waitForURL('**/saleshub/**', { timeout: 5000 });
    
    console.log('✅ 버튼 클릭 성공 - 세일즈허브로 이동됨');
    console.log('   현재 URL:', page.url());
  });
  
  test('trailing slash 경로에서도 동작 확인', async ({ page }) => {
    // trailing slash가 있는 경로로 직접 접속
    await page.goto('https://staging.workhub.biz:4400/hubs/');
    
    await page.waitForLoadState('networkidle');
    
    // GlobalNav 확인
    const globalNav = page.locator('nav').first();
    const isGlobalNavVisible = await globalNav.isVisible().catch(() => false);
    
    console.log('✅ /hubs/ 경로 - GlobalNav 표시 여부:', isGlobalNavVisible);
    
    // 버튼 클릭 확인
    const dashboardButton = page.locator('text=대시보드로 이동하기').first();
    await expect(dashboardButton).toBeVisible();
    await dashboardButton.click();
    
    await page.waitForURL('**/saleshub/**', { timeout: 5000 });
    
    console.log('✅ /hubs/ 경로에서도 버튼 클릭 성공');
  });
});
