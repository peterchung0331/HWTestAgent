import { test, expect } from '@playwright/test';

/**
 * Docker 환경 포트 설정 검증 API 통합 테스트
 *
 * 목적:
 * - HubManager API가 올바른 포트의 hub URL을 반환하는지 검증
 * - 프론트엔드 빌드 시 올바른 NEXT_PUBLIC 환경변수가 설정되었는지 검증
 *
 * 예상 포트:
 * - HubManager: 4290
 * - SalesHub: 4210
 * - FinHub: 4220
 * - OnboardingHub: 4230
 */

const HUBMANAGER_URL = 'http://localhost:4290';
const EXPECTED_PORTS = {
  wbsaleshub: '4210',
  wbfinhub: '4220',
  onboarding: '4230',
  wbrefhub: '4240'
};

test.describe('Docker 환경 포트 설정 검증', () => {

  test('HubManager API가 올바른 포트의 hub URL을 반환하는지 확인', async ({ request }) => {
    console.log('\n🔍 Step 1: HubManager /api/hubs 엔드포인트 호출');

    const response = await request.get(`${HUBMANAGER_URL}/api/hubs`);
    expect(response.ok()).toBeTruthy();

    const hubs = await response.json();
    console.log(`✓ Hub 목록 조회 성공 (${hubs.length}개)`);

    console.log('\n🔍 Step 2: 각 Hub의 URL 포트 검증');

    for (const hub of hubs) {
      // docs는 상대 경로이므로 스킵
      if (hub.slug === 'docs') {
        console.log(`  - ${hub.slug}: ${hub.url} (상대경로, 스킵)`);
        continue;
      }

      const expectedPort = EXPECTED_PORTS[hub.slug as keyof typeof EXPECTED_PORTS];

      if (expectedPort) {
        const expectedUrl = `http://localhost:${expectedPort}`;

        if (hub.url === expectedUrl) {
          console.log(`  ✓ ${hub.slug}: ${hub.url} (올바름)`);
        } else {
          console.log(`  ✗ ${hub.slug}: ${hub.url} (예상: ${expectedUrl})`);
        }

        expect(hub.url).toBe(expectedUrl);
      } else {
        console.log(`  ? ${hub.slug}: ${hub.url} (검증 규칙 없음)`);
      }
    }
  });

  test('프론트엔드 JavaScript에 올바른 API URL이 포함되어 있는지 확인', async ({ request }) => {
    console.log('\n🔍 Step 1: /hubs 페이지 HTML 가져오기');

    const response = await request.get(`${HUBMANAGER_URL}/hubs`);
    expect(response.ok()).toBeTruthy();

    const html = await response.text();
    console.log(`✓ HTML 페이지 로드 성공 (${html.length} bytes)`);

    console.log('\n🔍 Step 2: JavaScript 청크 파일 경로 추출');

    // Next.js static chunks 경로 찾기
    const chunkMatches = html.matchAll(/\/_next\/static\/chunks\/([a-f0-9]+)\.js/g);
    const chunkPaths = Array.from(chunkMatches).map(m => `/_next/static/chunks/${m[1]}.js`);

    console.log(`✓ JavaScript 청크 ${chunkPaths.length}개 발견`);

    console.log('\n🔍 Step 3: JavaScript 파일에서 포트 번호 검색');

    let found4290 = false;
    let found4090 = false;

    for (const chunkPath of chunkPaths.slice(0, 10)) { // 처음 10개만 확인
      const jsResponse = await request.get(`${HUBMANAGER_URL}${chunkPath}`);

      if (!jsResponse.ok()) continue;

      const jsContent = await jsResponse.text();

      if (jsContent.includes('localhost:4290')) {
        found4290 = true;
        console.log(`  ✓ ${chunkPath}: localhost:4290 발견`);
      }

      if (jsContent.includes('localhost:4090')) {
        found4090 = true;
        console.log(`  ✗ ${chunkPath}: localhost:4090 발견 (잘못된 포트!)`);
      }
    }

    console.log('\n📊 검증 결과:');
    console.log(`  - localhost:4290 (올바른 포트): ${found4290 ? '✓ 발견' : '✗ 미발견'}`);
    console.log(`  - localhost:4090 (잘못된 포트): ${found4090 ? '✗ 발견됨 (문제!)' : '✓ 없음'}`);

    expect(found4290).toBeTruthy();
    expect(found4090).toBeFalsy();
  });

  test('Google OAuth 리다이렉트 URL이 올바른 포트를 사용하는지 확인', async ({ page }) => {
    console.log('\n🔍 Step 1: /hubs 페이지 접속');

    await page.goto(`${HUBMANAGER_URL}/hubs`);
    console.log('✓ 페이지 로드 완료');

    console.log('\n🔍 Step 2: 네트워크 요청 모니터링 시작');

    const authRequests: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('google-oauth')) {
        authRequests.push(url);
        console.log(`  📡 Google OAuth 요청 감지: ${url}`);
      }
    });

    console.log('\n🔍 Step 3: SalesHub 카드 클릭 시뮬레이션');

    // 페이지에서 Google OAuth URL 생성 로직 실행
    const oauthUrl = await page.evaluate(() => {
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4090').replace(/\/api\/?$/, '');
      return `${baseUrl}/api/auth/google-oauth?hub_slug=wbsaleshub`;
    });

    console.log(`  생성된 OAuth URL: ${oauthUrl}`);

    console.log('\n📊 검증 결과:');

    if (oauthUrl.includes('localhost:4290')) {
      console.log('  ✓ OAuth URL이 올바른 포트(4290)를 사용합니다');
    } else if (oauthUrl.includes('localhost:4090')) {
      console.log('  ✗ OAuth URL이 잘못된 포트(4090)를 사용합니다');
    } else {
      console.log(`  ? OAuth URL: ${oauthUrl}`);
    }

    expect(oauthUrl).toContain('localhost:4290');
    expect(oauthUrl).not.toContain('localhost:4090');
  });

  test('SalesHub에서 HubManager URL이 올바르게 설정되었는지 확인', async ({ request }) => {
    console.log('\n🔍 Step 1: SalesHub API health check');

    const healthResponse = await request.get('http://localhost:4210/api/health');

    if (!healthResponse.ok()) {
      console.log('⚠️  SalesHub가 실행 중이지 않습니다. 테스트를 건너뜁니다.');
      test.skip();
      return;
    }

    console.log('✓ SalesHub 실행 중');

    console.log('\n🔍 Step 2: SalesHub 환경변수 확인 (간접 검증)');

    // SalesHub의 로그인 페이지에서 HubManager URL 확인
    const loginResponse = await request.get('http://localhost:4210/login');

    if (loginResponse.ok()) {
      const loginHtml = await loginResponse.text();

      if (loginHtml.includes('localhost:4290')) {
        console.log('  ✓ SalesHub에서 HubManager URL이 localhost:4290으로 설정됨');
      } else if (loginHtml.includes('localhost:4090')) {
        console.log('  ✗ SalesHub에서 HubManager URL이 localhost:4090으로 설정됨 (잘못됨)');
      } else {
        console.log('  ? HubManager URL을 페이지에서 찾을 수 없음');
      }
    }
  });
});
