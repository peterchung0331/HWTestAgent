import { test, expect } from '@playwright/test';

test.describe('WBSalesHub 로그인 디버깅', () => {
  test('허브 선택 → SalesHub 클릭 → 로그인 화면 → 버튼 클릭 테스트', async ({ page }) => {
    // 콘솔 및 네트워크 모니터링
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`📋 Console ${type}: ${text}`);
    });

    page.on('requestfailed', request => {
      console.log(`❌ Request failed: ${request.url()}`);
    });

    console.log('\n🔍 Step 1: 허브 선택 페이지로 이동');
    await page.goto('http://localhost:3090/hubs');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/step1-hub-selection.png' });

    console.log('\n🔍 Step 2: Sales Hub 카드 찾기');
    const salesHubCard = page.locator('[role="button"][aria-label*="Sales Hub"]');

    if (await salesHubCard.isVisible({ timeout: 5000 })) {
      console.log('✅ Sales Hub 카드 발견');
      await salesHubCard.click();
      console.log('✅ Sales Hub 클릭 완료');

      // 페이지 이동 대기
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      console.log(`📍 현재 URL: ${currentUrl}`);
      await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/step2-after-click.png' });
    } else {
      console.log('❌ Sales Hub 카드를 찾을 수 없음');
      throw new Error('Sales Hub 카드 없음');
    }

    console.log('\n🔍 Step 3: 로그인 화면 확인');
    const currentUrl = page.url();
    console.log(`📍 로그인 화면 URL: ${currentUrl}`);

    // 에러 메시지 확인
    const errorMsg = page.locator('text=개발 모드 로그인에 실패했습니다');
    if (await errorMsg.isVisible()) {
      console.log('⚠️  에러 메시지 발견: 개발 모드 로그인에 실패했습니다');
    }

    // 개발 모드 로그인 버튼 찾기
    console.log('\n🔍 Step 4: "개발 모드 로그인" 버튼 찾기');

    const devLoginButton = page.locator('button:has-text("개발 모드 로그인")');
    const devLoginButtonVisible = await devLoginButton.isVisible({ timeout: 2000 }).catch(() => false);

    console.log(`개발 모드 로그인 버튼 존재: ${devLoginButtonVisible}`);

    if (devLoginButtonVisible) {
      console.log('✅ "개발 모드 로그인" 버튼 발견');

      // 버튼 상태 확인
      const isEnabled = await devLoginButton.isEnabled();
      const isDisabled = await devLoginButton.getAttribute('disabled');
      console.log(`버튼 활성화: ${isEnabled}, disabled 속성: ${isDisabled}`);

      await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/step4-before-click.png' });

      // 버튼 클릭 시도
      console.log('\n🔍 Step 5: "개발 모드 로그인" 버튼 클릭 시도');
      await devLoginButton.click({ force: true });
      console.log('✅ 버튼 클릭 완료');

      // 클릭 후 대기
      await page.waitForTimeout(3000);

      const afterClickUrl = page.url();
      console.log(`📍 클릭 후 URL: ${afterClickUrl}`);
      await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/step5-after-dev-login-click.png' });

      // Google OAuth 화면으로 이동했는지 확인
      if (afterClickUrl.includes('accounts.google.com')) {
        console.log('✅ Google OAuth 화면으로 이동 성공!');
      } else if (afterClickUrl.includes('localhost:4090')) {
        console.log('⚠️  HubManager로 리다이렉트됨');
      } else {
        console.log(`⚠️  예상치 못한 URL: ${afterClickUrl}`);
      }
    }

    // HubManager 로그인 버튼 찾기
    console.log('\n🔍 Step 6: "HubManager로 로그인" 버튼 찾기');
    const hubManagerButton = page.locator('button:has-text("HubManager로 로그인")');
    const hubManagerButtonVisible = await hubManagerButton.isVisible({ timeout: 2000 }).catch(() => false);

    console.log(`HubManager로 로그인 버튼 존재: ${hubManagerButtonVisible}`);

    if (hubManagerButtonVisible) {
      console.log('✅ "HubManager로 로그인" 버튼 발견');

      const isEnabled = await hubManagerButton.isEnabled();
      console.log(`버튼 활성화: ${isEnabled}`);

      // 버튼 클릭
      console.log('\n🔍 Step 7: "HubManager로 로그인" 버튼 클릭');
      await hubManagerButton.click();
      console.log('✅ 버튼 클릭 완료');

      // 클릭 후 대기
      await page.waitForTimeout(3000);

      const finalUrl = page.url();
      console.log(`📍 최종 URL: ${finalUrl}`);
      await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/step7-final.png' });

      // Google OAuth 화면 확인
      if (finalUrl.includes('accounts.google.com')) {
        console.log('✅ Google OAuth 화면으로 이동 성공!');
      } else if (finalUrl.includes('localhost:4090/api/auth/google-oauth')) {
        console.log('✅ HubManager OAuth 엔드포인트로 이동 (리다이렉트 대기 중)');
        await page.waitForTimeout(2000);
        const afterRedirectUrl = page.url();
        console.log(`📍 리다이렉트 후 URL: ${afterRedirectUrl}`);
        await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/step7-after-redirect.png' });
      } else {
        console.log(`⚠️  예상치 못한 URL: ${finalUrl}`);
      }
    }

    console.log('\n📍 최종 상태 요약');
    console.log(`현재 URL: ${page.url()}`);
    console.log('테스트 완료');
  });
});
