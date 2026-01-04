import { test, expect } from '@playwright/test';

/**
 * WBSalesHub SSO 전체 플로우 테스트
 *
 * 개발 모드 자동 로그인을 사용하여 Google OAuth를 우회하고
 * 쿠키 기반 SSO가 제대로 작동하는지 확인
 */

test.describe('WBSalesHub SSO Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 네트워크 및 콘솔 모니터링
    page.on('requestfailed', request => {
      console.log('❌ Request failed:', request.url(), request.failure()?.errorText);
    });
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.log('❌ Console Error:', text);
      } else if (text.includes('Cookie') || text.includes('auth') || text.includes('redirect') || text.includes('Login')) {
        console.log(`📋 Console ${type}:`, text);
      }
    });
    page.on('response', async response => {
      const url = response.url();
      const status = response.status();
      if (url.includes('/auth/') || url.includes('saleshub') || url.includes('sso-complete')) {
        console.log(`📡 Response: ${status} ${url}`);
        if (status === 302 || status === 301) {
          const location = response.headers()['location'];
          console.log(`  ↪️  Redirect to: ${location}`);
        }
      }
    });
  });

  test('개발 모드 로그인 → 허브 선택 → 세일즈허브 접속', async ({ page, context }) => {
    console.log('\n🔍 Step 1: HubManager 개발 모드 로그인 (JWT 토큰 받기)');

    // 1. 개발 모드 자동 로그인으로 JWT 토큰 받기
    const devLoginResponse = await page.goto('http://localhost:4090/api/auth/dev-login');
    const responseBody = await devLoginResponse?.json();

    console.log('  Dev login 응답:', responseBody?.success ? '성공' : '실패');

    if (!responseBody?.success || !responseBody?.data?.token) {
      throw new Error('Dev login 실패: 토큰을 받지 못함');
    }

    const accessToken = responseBody.data.token;
    console.log(`  Access Token 받음: ${accessToken.substring(0, 50)}...`);

    // 2. JWT 토큰을 쿠키로 설정
    console.log('\n🔍 Step 2: JWT 토큰을 쿠키로 설정');

    await context.addCookies([
      {
        name: 'wbhub_access_token',
        value: accessToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24시간
      },
      {
        name: 'wbhub_refresh_token',
        value: accessToken, // 개발 모드에서는 같은 토큰 사용
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7일
      }
    ]);

    console.log('  ✅ 쿠키 설정 완료');

    // 쿠키 확인
    const cookiesAfterLogin = await context.cookies();
    console.log('\n🍪 설정된 쿠키:');
    cookiesAfterLogin.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 50)}... (domain: ${cookie.domain})`);
    });

    console.log('\n🔍 Step 3: 허브 선택 페이지로 이동');

    // 3. 허브 선택 페이지 접속
    await page.goto('http://localhost:3090/hubs');
    await page.waitForLoadState('networkidle');

    // 스크린샷
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/sso-flow-02-hub-selection.png',
      fullPage: true
    });

    console.log('\n🔍 Step 4: Sales Hub 카드 클릭');

    // 4. Sales Hub 카드 찾기 및 클릭
    const salesHubCard = page.locator('[role="button"][aria-label*="Sales Hub"]');

    if (await salesHubCard.isVisible({ timeout: 5000 })) {
      console.log('✅ Sales Hub 카드 발견');

      // 클릭 전 스크린샷
      await page.screenshot({
        path: '/home/peterchung/HWTestAgent/test-results/sso-flow-03-before-click.png',
        fullPage: true
      });

      // 클릭
      await salesHubCard.click();
      console.log('✅ Sales Hub 클릭 완료');

      // 네비게이션 대기 (충분한 시간)
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await page.waitForTimeout(2000);

      // 5. 최종 URL 확인
      const finalUrl = page.url();
      console.log(`\n📍 Step 5: 최종 결과 확인`);
      console.log(`  최종 URL: ${finalUrl}`);

      // 쿠키 재확인
      const finalCookies = await context.cookies();
      console.log('\n🍪 최종 쿠키:');
      finalCookies.forEach(cookie => {
        console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 50)}... (domain: ${cookie.domain})`);
      });

      // 최종 스크린샷
      await page.screenshot({
        path: '/home/peterchung/HWTestAgent/test-results/sso-flow-04-final.png',
        fullPage: true
      });

      // 6. 결과 검증
      if (finalUrl.includes('saleshub') || finalUrl.includes(':3010')) {
        console.log('\n✅ 성공: 세일즈허브로 이동됨!');

        const pageTitle = await page.title();
        console.log(`  페이지 타이틀: ${pageTitle}`);

        // 페이지 내용 확인
        const bodyText = await page.locator('body').textContent();
        if (bodyText?.includes('Sales') || bodyText?.includes('세일즈')) {
          console.log('  ✅ 세일즈허브 콘텐츠 확인됨');
        }

        // 성공 어서션
        expect(finalUrl).toContain('3010');

      } else if (finalUrl.includes('/hubs')) {
        console.log('\n❌ 실패: 허브 선택 화면으로 돌아옴');

        // 에러 메시지 확인
        const errorText = await page.locator('text=/error|fail|invalid|denied/i').first().textContent().catch(() => null);
        if (errorText) {
          console.log(`  에러 메시지: ${errorText}`);
        }

        // /auth/me 엔드포인트 테스트
        console.log('\n🔍 SalesHub /auth/me 테스트:');
        const authMeResponse = await page.goto('http://localhost:4010/auth/me');
        const authMeStatus = authMeResponse?.status();
        console.log(`  응답 상태: ${authMeStatus}`);

        if (authMeStatus === 200) {
          const authMeBody = await authMeResponse?.json();
          console.log(`  응답 본문:`, JSON.stringify(authMeBody, null, 2));
        }

        throw new Error('허브 선택 화면으로 되돌아감 - SSO 실패');

      } else if (finalUrl.includes('google.com')) {
        console.log('\n❌ 실패: Google 로그인 페이지로 리다이렉트됨');
        console.log('  개발 모드 로그인이 제대로 작동하지 않음');

        throw new Error('Google OAuth 페이지로 리다이렉트됨 - 개발 모드 로그인 실패');

      } else {
        console.log(`\n⚠️  예상치 못한 URL: ${finalUrl}`);
        throw new Error(`예상치 못한 URL: ${finalUrl}`);
      }

    } else {
      console.log('❌ Sales Hub 카드를 찾을 수 없음');
      throw new Error('Sales Hub 카드를 찾을 수 없음');
    }
  });
});
