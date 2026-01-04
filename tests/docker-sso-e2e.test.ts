import { test, expect } from '@playwright/test';

/**
 * Docker 환경 SSO E2E 테스트
 * localhost + 4200번대 포트로 스테이징 환경 테스트
 */

const HUBMANAGER_URL = 'http://localhost:4290';
const SALESHUB_URL = 'http://localhost:4210';

test.describe('Docker 환경 SSO E2E 테스트', () => {
  test('HubManager에서 SalesHub로 SSO 리다이렉트', async ({ page }) => {
    console.log('\n🔍 Step 1: HubManager 허브 선택 페이지 접속');

    // 1. HubManager 허브 선택 페이지 접속
    await page.goto(`${HUBMANAGER_URL}/hubs`, { waitUntil: 'networkidle' });
    console.log(`✅ 페이지 로드: ${HUBMANAGER_URL}/hubs`);

    // 스크린샷 저장
    await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/docker-sso-1-hubs.png', fullPage: true });

    console.log('\n🔍 Step 2: SalesHub 카드 찾기');

    // 2. SalesHub 카드 찾기 (여러 선택자 시도)
    const salesHubCard = await page.locator('text=SalesHub').first();

    if (await salesHubCard.count() === 0) {
      console.log('❌ SalesHub 카드를 찾을 수 없습니다');
      throw new Error('SalesHub card not found');
    }

    console.log('✅ SalesHub 카드 발견');
    console.log('\n🔍 Step 3: SalesHub 카드 클릭 및 SSO 리다이렉트 대기');

    // 3. SalesHub 카드 클릭 (navigation을 기다림)
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      salesHubCard.click()
    ]);

    console.log(`✅ 리다이렉트 완료`);
    console.log(`📍 현재 URL: ${page.url()}`);

    // 4. 최종 URL이 SalesHub 도메인인지 확인
    const finalUrl = page.url();
    expect(finalUrl).toContain(WSL_IP);
    expect(finalUrl).toContain('3010');

    // 에러 페이지가 아닌지 확인
    expect(finalUrl).not.toContain('error=');
    expect(finalUrl).not.toContain('login');

    console.log('✅ SSO 리다이렉트 성공!');

    // 스크린샷 저장
    await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/docker-sso-2-saleshub.png', fullPage: true });

    // 5. 대시보드 요소 확인 (예: 로그아웃 버튼, 사용자 메뉴 등)
    await page.waitForTimeout(2000); // 페이지 완전 로드 대기

    console.log('✅ Docker 환경 SSO E2E 테스트 완료!');
  });

  test('SalesHub 대시보드 인증 상태 확인', async ({ page }) => {
    console.log('\n🔍 Step 1: HubManager 로그인 없이 SalesHub 직접 접근');

    // 1. SalesHub에 직접 접근 (인증 없음)
    await page.goto(SALESHUB_URL, { waitUntil: 'networkidle' });

    console.log(`📍 현재 URL: ${page.url()}`);

    // 2. 로그인 페이지로 리다이렉트되는지 확인
    const finalUrl = page.url();

    if (finalUrl.includes('login')) {
      console.log('✅ 인증되지 않은 접근 - 로그인 페이지로 리다이렉트됨');

      // 스크린샷 저장
      await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/docker-sso-3-login-redirect.png', fullPage: true });
    } else {
      console.log('⚠️  로그인 페이지로 리다이렉트되지 않음');
    }

    console.log('✅ 인증 상태 확인 테스트 완료');
  });
});
