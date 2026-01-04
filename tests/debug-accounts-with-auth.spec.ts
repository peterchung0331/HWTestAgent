import { test, expect } from '@playwright/test';

test('로그인 후 Tools > Accounts 접근 테스트', async ({ page }) => {
  // URL 변경 모니터링
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log(`🔗 URL 변경: ${frame.url()}`);
    }
  });

  // 네트워크 및 콘솔 모니터링
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log('❌ Console Error:', text);
    } else if (text.includes('자동 로그인') || text.includes('AuthContext') || text.includes('개발 환경') || text.includes('인증') || text.includes('🔍') || text.includes('🔧')) {
      console.log(`📝 Console [${type}]:`, text);
    }
  });

  // 1. Hubs 페이지 접속 (자동 로그인 포함)
  console.log('📍 Step 1: Hubs 페이지 접속 (자동 로그인 실행됨)');
  await page.goto('http://localhost:3090/hubs');

  // 자동 로그인이 완료될 때까지 대기
  await page.waitForTimeout(2000);

  // 수동으로 dev-login API 호출하여 응답 확인
  console.log('📍 Step 2: 수동으로 dev-login API 호출하여 응답 확인');
  const apiResponse = await page.evaluate(async () => {
    const response = await fetch('/api/auth/dev-login', {
      credentials: 'include'
    });
    const data = await response.json();
    return {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      data,
      cookies: document.cookie
    };
  });
  console.log('API 응답:', JSON.stringify(apiResponse, null, 2));

  // 콘솔 로그 확인
  const consoleLogs = await page.evaluate(() => {
    return {
      hasConnectSid: document.cookie.includes('connect.sid'),
      hasWbhubSid: document.cookie.includes('wbhub.sid'),
      hasWbhubAccessToken: document.cookie.includes('wbhub_access_token'),
      allCookies: document.cookie
    };
  });
  console.log(`자동 로그인 상태:`, consoleLogs);

  await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/auth-01-hubs-page.png', fullPage: true });

  // 3. Tools 버튼 찾기 및 클릭
  console.log('📍 Step 3: Tools 버튼 클릭');
  const toolsButton = page.locator('button:has-text("Tools")');
  await expect(toolsButton).toBeVisible();
  await toolsButton.click();
  await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/auth-02-tools-menu-open.png', fullPage: true });

  // 4. Accounts 메뉴 항목 찾기 및 클릭
  console.log('📍 Step 4: Accounts 버튼 클릭');
  const accountsMenuItem = page.locator('button:has-text("Accounts")').filter({ hasNotText: 'Bot' });
  await expect(accountsMenuItem).toBeVisible();

  const isDisabled = await accountsMenuItem.isDisabled();
  console.log(`Accounts 버튼 활성화 상태: ${!isDisabled}`);

  await accountsMenuItem.click();

  // 5. 페이지 이동 대기 (AuthContext가 토큰을 로드하도록 충분한 시간 제공)
  console.log('📍 Step 5: 페이지 이동 대기');
  await page.waitForTimeout(5000);

  const currentUrl = page.url();
  console.log(`현재 URL: ${currentUrl}`);

  await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/auth-03-after-click.png', fullPage: true });

  // 6. 최종 URL 확인
  if (currentUrl.includes('/admin/accounts')) {
    console.log('✅ 성공: /admin/accounts 페이지로 이동했습니다');
  } else if (currentUrl.includes('/hubs')) {
    console.log('❌ 실패: /hubs로 리다이렉트되었습니다 (로그인 문제 또는 권한 문제)');

    // 사용자 정보 확인
    const userInfo = await page.evaluate(() => {
      return {
        hasAccessToken_localStorage: !!localStorage.getItem('accessToken'),
        hasAccessToken_sessionStorage: !!sessionStorage.getItem('wbhub_access_token'),
        hasRefreshToken: !!localStorage.getItem('wbhub_refresh_token'),
        cookies: document.cookie,
        allSessionStorage: Object.keys(sessionStorage).length > 0 ?
          Object.keys(sessionStorage).map(key => `${key}: ${sessionStorage.getItem(key)?.substring(0, 50)}`) :
          []
      };
    });
    console.log('사용자 상태:', userInfo);
  } else {
    console.log(`❓ 예상치 못한 URL: ${currentUrl}`);
  }

  await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/auth-04-final-page.png', fullPage: true });
});
