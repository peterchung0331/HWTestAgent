import { Page } from '@playwright/test';

/**
 * Google OAuth 자동 로그인 헬퍼
 *
 * 테스트 계정:
 * - Email: biz.dev@wavebridge.com
 * - Password: wave1234!!
 *
 * 환경변수:
 * - TEST_GOOGLE_EMAIL
 * - TEST_GOOGLE_PASSWORD
 */

export interface GoogleOAuthConfig {
  email: string;
  password: string;
  loginUrl: string;
  redirectPath?: string; // 로그인 후 리다이렉트될 경로
  timeout?: number;
}

/**
 * Google OAuth 자동 로그인 수행
 *
 * @param page - Playwright Page 객체
 * @param config - 로그인 설정
 * @returns 로그인 성공 여부
 */
export async function loginWithGoogle(
  page: Page,
  config: GoogleOAuthConfig
): Promise<boolean> {
  const { email, password, loginUrl, redirectPath, timeout = 30000 } = config;

  try {
    console.log('🔐 Google OAuth 로그인 시작');
    console.log('   Email:', email);
    console.log('   Login URL:', loginUrl);

    // 1. 로그인 페이지 접속
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout });

    // Google 로그인 버튼 클릭 (여러 선택자 시도)
    const googleButtonSelectors = [
      'a[href*="/api/auth/google-oauth"]',
      'a[href*="/auth/google"]',
      'button:has-text("Google")',
      'button:has-text("구글")',
      '[data-testid="google-login"]'
    ];

    let googleButtonClicked = false;
    for (const selector of googleButtonSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        console.log('   🔗 Google 버튼 발견:', selector);
        await element.click();
        googleButtonClicked = true;
        break;
      }
    }

    if (!googleButtonClicked) {
      console.log('   ⚠️ Google 버튼을 찾을 수 없음, 직접 OAuth URL 접속');
      await page.goto(`${loginUrl}/api/auth/google-oauth`, { waitUntil: 'load', timeout });
    }

    // 2. Google 로그인 페이지 대기
    await page.waitForURL('**/accounts.google.com/**', { timeout });
    console.log('   ✓ Google 로그인 페이지 진입');

    // 3. 이메일 입력
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(email);
    console.log('   ✓ 이메일 입력 완료');

    // "다음" 버튼 클릭
    const nextButtonSelectors = [
      'button:has-text("다음")',
      'button:has-text("Next")',
      '#identifierNext button',
      'button[type="button"]'
    ];

    for (const selector of nextButtonSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0 && await button.isVisible()) {
        await button.click();
        console.log('   ✓ 이메일 "다음" 버튼 클릭');
        break;
      }
    }

    // 4. 비밀번호 입력 대기
    await page.waitForTimeout(2000); // Google 페이지 전환 대기

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill(password);
    console.log('   ✓ 비밀번호 입력 완료');

    // "다음" 버튼 클릭
    const passwordNextSelectors = [
      'button:has-text("다음")',
      'button:has-text("Next")',
      '#passwordNext button',
      'button[type="button"]'
    ];

    for (const selector of passwordNextSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0 && await button.isVisible()) {
        await button.click();
        console.log('   ✓ 비밀번호 "다음" 버튼 클릭');
        break;
      }
    }

    // 5. 앱으로 리다이렉트 대기
    const expectedUrl = redirectPath || loginUrl;
    await page.waitForURL(
      (url) => url.hostname !== 'accounts.google.com',
      { timeout }
    );
    console.log('   ✓ OAuth 리다이렉트 완료');
    console.log('   📍 Current URL:', page.url());

    // 6. 로그인 성공 확인 (쿠키 존재 확인)
    const cookies = await page.context().cookies();
    const hasAuthCookie = cookies.some(c =>
      c.name.toLowerCase().includes('jwt') ||
      c.name.toLowerCase().includes('session') ||
      c.name.toLowerCase().includes('token')
    );

    if (hasAuthCookie) {
      console.log('   ✅ 로그인 성공 (JWT 토큰 확인)');
      return true;
    } else {
      console.log('   ⚠️ 인증 쿠키가 없음 (로그인 실패 가능성)');
      return false;
    }

  } catch (error) {
    console.error('   ❌ Google OAuth 로그인 실패:', error);
    return false;
  }
}

/**
 * 환경변수에서 테스트 계정 정보 가져오기
 */
export function getTestGoogleCredentials(): { email: string; password: string } {
  const email = process.env.TEST_GOOGLE_EMAIL || 'biz.dev@wavebridge.com';
  const password = process.env.TEST_GOOGLE_PASSWORD || 'wave1234!!';
  return { email, password };
}

/**
 * 로그아웃 수행
 */
export async function logout(page: Page, logoutUrl: string): Promise<void> {
  try {
    console.log('🚪 로그아웃 시작');
    await page.goto(logoutUrl, { waitUntil: 'networkidle', timeout: 10000 });

    // 쿠키 삭제
    await page.context().clearCookies();
    console.log('   ✅ 로그아웃 완료');
  } catch (error) {
    console.error('   ❌ 로그아웃 실패:', error);
  }
}

/**
 * 인증 상태 확인
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  const hasAuthCookie = cookies.some(c =>
    c.name.toLowerCase().includes('jwt') ||
    c.name.toLowerCase().includes('session') ||
    c.name.toLowerCase().includes('token')
  );

  console.log('🔐 인증 상태:', hasAuthCookie ? '✅ 인증됨' : '❌ 비인증');
  return hasAuthCookie;
}

/**
 * 인증 토큰 가져오기
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(c =>
    c.name.toLowerCase().includes('jwt') ||
    c.name.toLowerCase().includes('session') ||
    c.name.toLowerCase().includes('token')
  );

  if (authCookie) {
    console.log('🎫 Auth Token:', authCookie.name);
    return authCookie.value;
  }

  console.log('⚠️ Auth Token을 찾을 수 없음');
  return null;
}
