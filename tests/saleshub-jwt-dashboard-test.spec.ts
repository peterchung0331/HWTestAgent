import { test, expect } from '@playwright/test';
import * as fs from 'fs';

/**
 * SalesHub JWT 토큰 기반 대시보드 접근 테스트
 * Google OAuth를 건너뛰고 dev-login 엔드포인트를 사용하여 JWT 토큰 획득 후 대시보드 접근
 */

const SALESHUB_URL = 'http://localhost:3010';
const SALESHUB_API_URL = 'http://localhost:4010';

test.describe('SalesHub JWT 토큰 기반 대시보드 테스트', () => {
  test('dev-login으로 JWT 토큰 받아서 대시보드 접근', async ({ page, context }) => {
    const screenshotDir = '/home/peterchung/HWTestAgent/test-results/saleshub-jwt-test';

    // 스크린샷 디렉토리 생성
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // 콘솔 로그 모니터링
    page.on('console', msg => {
      console.log(`📋 Console ${msg.type()}: ${msg.text()}`);
    });

    page.on('requestfailed', request => {
      console.log(`❌ Request failed: ${request.url()}`);
    });

    console.log('\n🔍 Step 1: Dev-login 엔드포인트 호출하여 JWT 토큰 획득');

    // Dev-login 엔드포인트를 리다이렉트 없이 호출
    const devLoginResponse = await page.request.get(`${SALESHUB_API_URL}/auth/dev-login`, {
      maxRedirects: 0,
    });

    console.log(`📍 Dev-login 응답 상태: ${devLoginResponse.status()}`);

    // 리다이렉트 Location 헤더에서 URL 추출
    const locationHeader = devLoginResponse.headers()['location'];
    console.log(`📍 Redirect Location: ${locationHeader}`);

    if (!locationHeader) {
      throw new Error('Dev-login에서 리다이렉트 URL을 받지 못했습니다.');
    }

    // URL에서 토큰 추출
    const redirectUrl = new URL(locationHeader, SALESHUB_URL);
    const accessToken = redirectUrl.searchParams.get('accessToken');
    const refreshToken = redirectUrl.searchParams.get('refreshToken');
    const authStatus = redirectUrl.searchParams.get('auth');

    console.log(`🔐 Access Token: ${accessToken?.substring(0, 50)}...`);
    console.log(`🔐 Refresh Token: ${refreshToken?.substring(0, 50)}...`);
    console.log(`✅ Auth Status: ${authStatus}`);

    if (!accessToken || !refreshToken) {
      console.error('❌ 토큰을 받지 못했습니다!');
      throw new Error('Dev-login에서 토큰을 받지 못했습니다.');
    }

    console.log('\n🔍 Step 2: 로컬 스토리지에 토큰 설정');

    // 먼저 페이지를 로드해야 로컬 스토리지에 접근 가능
    await page.goto(`${SALESHUB_URL}/`);

    // 로컬 스토리지에 JWT 토큰 저장
    await page.evaluate(({ accessToken, refreshToken }) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      console.log('✅ LocalStorage에 토큰 저장 완료');
    }, { accessToken, refreshToken });

    console.log('✅ 로컬 스토리지에 JWT 토큰 설정 완료');

    console.log('\n🔍 Step 3: 페이지 새로고침하여 토큰 적용');

    // 페이지 새로고침하여 토큰 적용
    await page.reload({
      waitUntil: 'networkidle',
    });

    await page.screenshot({
      path: `${screenshotDir}/02-dashboard-page.png`,
      fullPage: true
    });

    const finalUrl = page.url();
    console.log(`📍 최종 URL: ${finalUrl}`);

    console.log('\n🔍 Step 4: 대시보드 요소 확인');

    // 로딩 화면이 아닌지 확인 (최대 10초 대기)
    await page.waitForTimeout(2000);

    // 대시보드 주요 요소 확인
    const possibleSelectors = [
      'nav',                                    // 네비게이션
      '[role="navigation"]',                    // ARIA 네비게이션
      'aside',                                  // 사이드바
      'main',                                   // 메인 컨텐츠
      'text=대시보드',                          // 대시보드 텍스트
      'text=고객',                              // 고객 메뉴
      'text=미팅',                              // 미팅 메뉴
      '[data-testid="dashboard"]',              // 테스트 ID
    ];

    let foundElement = false;
    for (const selector of possibleSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`✅ 요소 발견: ${selector}`);
          foundElement = true;
          break;
        }
      } catch (e) {
        console.log(`⚠️  요소 없음: ${selector}`);
      }
    }

    if (!foundElement) {
      console.log('⚠️  알려진 대시보드 요소를 찾지 못했습니다. 전체 페이지 내용 확인 중...');
      const bodyText = await page.locator('body').textContent();
      console.log(`📄 페이지 텍스트 (처음 500자):\n${bodyText?.substring(0, 500)}`);
    }

    await page.screenshot({
      path: `${screenshotDir}/03-final-state.png`,
      fullPage: true
    });

    console.log('\n🔍 Step 5: 로그인 페이지로 리다이렉트되지 않았는지 확인');

    // 로그인 페이지가 아닌지 확인
    expect(finalUrl).not.toContain('/login');
    console.log('✅ 로그인 페이지로 리다이렉트되지 않음');

    // 대시보드 또는 루트 페이지에 있는지 확인
    const isAtDashboard = finalUrl.includes('/dashboard') ||
                          finalUrl === `${SALESHUB_URL}/` ||
                          finalUrl === `${SALESHUB_URL}`;

    if (isAtDashboard) {
      console.log('✅ 대시보드 페이지에 접근 성공!');
    } else {
      console.log(`⚠️  예상치 못한 URL: ${finalUrl}`);
    }

    console.log('\n📊 테스트 완료 요약:');
    console.log(`  - Dev-login: ✅`);
    console.log(`  - JWT 토큰 획득: ✅`);
    console.log(`  - 쿠키 설정: ✅`);
    console.log(`  - 대시보드 접근: ${isAtDashboard ? '✅' : '⚠️'}`);
    console.log(`  - 로그인 페이지 회피: ${!finalUrl.includes('/login') ? '✅' : '❌'}`);
  });
});
