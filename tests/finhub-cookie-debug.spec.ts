import { test, expect } from '@playwright/test';

/**
 * WBFinHub 쿠키 인증 상세 디버깅
 */

test.describe('WBFinHub 쿠키 인증 디버깅', () => {
  test.setTimeout(120000);

  test('쿠키 설정 및 전달 디버깅', async ({ page, context }) => {
    const networkLogs: string[] = [];

    // 모든 요청/응답 로깅
    page.on('request', request => {
      const cookies = request.headers()['cookie'];
      networkLogs.push(`➡️ ${request.method()} ${request.url()} | Cookies: ${cookies || 'none'}`);
    });

    page.on('response', response => {
      const setCookie = response.headers()['set-cookie'];
      if (setCookie) {
        networkLogs.push(`⬅️ ${response.status()} ${response.url()} | Set-Cookie: ${setCookie.substring(0, 100)}...`);
      }
    });

    // Step 1: 로그인 페이지 접근
    console.log('\n📍 Step 1: 로그인 페이지 접근');
    await page.goto('http://localhost:3020/login', { waitUntil: 'networkidle' });

    // Step 2: 개발 모드 로그인 클릭
    console.log('📍 Step 2: 개발 모드 로그인 클릭');
    const devLoginButton = page.locator('button:has-text("개발 모드 로그인")');
    await devLoginButton.click();

    // SSO 리다이렉트 대기
    await page.waitForURL(/dashboard|login/, { timeout: 30000 });
    console.log('   SSO 후 URL:', page.url());

    // 쿠키 확인
    const cookies = await context.cookies();
    console.log('\n📍 현재 브라우저 쿠키:');
    cookies.forEach(c => {
      console.log(`   - ${c.name}: ${c.value.substring(0, 50)}... (domain: ${c.domain}, path: ${c.path})`);
    });

    // 잠시 대기 후 URL 확인
    await page.waitForTimeout(2000);
    console.log('\n📍 2초 후 URL:', page.url());

    // 만약 로그인 페이지로 돌아갔으면 에러 확인
    if (page.url().includes('/login')) {
      const urlParams = new URL(page.url()).searchParams;
      const error = urlParams.get('error');
      console.log('   에러 파라미터:', error || 'none');
    }

    // /auth/me 직접 호출해보기
    console.log('\n📍 /auth/me 직접 호출:');
    const meResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/auth/me', {
          credentials: 'include',
        });
        const data = await response.json();
        return { status: response.status, data };
      } catch (err: any) {
        return { error: err.message };
      }
    });
    console.log('   응답:', JSON.stringify(meResponse, null, 2));

    // 네트워크 로그 출력
    console.log('\n📍 네트워크 로그 (마지막 20개):');
    networkLogs.slice(-20).forEach(log => console.log('   ', log));

    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/finhub-cookie-debug.png',
      fullPage: true
    });

    // 최종 상태 확인
    const finalUrl = page.url();
    console.log('\n📍 최종 URL:', finalUrl);
  });
});
