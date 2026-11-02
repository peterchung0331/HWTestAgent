import { test, expect } from '@playwright/test';

/**
 * SalesHub SSO 토큰 검증 API 통합 테스트
 * HubManager에서 발급한 토큰을 SalesHub가 제대로 검증하는지 테스트
 */

const HUBMANAGER_API_URL = 'http://localhost:4290/api';
const SALESHUB_API_URL = 'http://localhost:4210';

test.describe('SalesHub SSO 토큰 검증 API 통합 테스트', () => {
  test('HubManager 토큰으로 SalesHub SSO 완료 테스트', async ({ request }) => {
    console.log('\n🔍 Step 1: HubManager에 dev-login으로 JWT 토큰 획득');

    // 1. HubManager dev-login으로 토큰 획득 (JSON 응답)
    const hubManagerDevLogin = await request.get(`${HUBMANAGER_API_URL}/auth/dev-login`);

    console.log(`📍 HubManager dev-login 상태: ${hubManagerDevLogin.status()}`);

    const devLoginData = await hubManagerDevLogin.json();
    console.log(`📄 Dev-login 응답:`, JSON.stringify(devLoginData, null, 2));

    if (!devLoginData.success || !devLoginData.data?.token) {
      throw new Error('HubManager dev-login에서 토큰을 받지 못했습니다.');
    }

    const hubManagerToken = devLoginData.data.token;
    console.log(`🔐 HubManager Token: ${hubManagerToken?.substring(0, 50)}...`);

    console.log('\n🔍 Step 2: SalesHub /auth/sso-complete 엔드포인트 테스트');

    // 2. SalesHub에 쿠키로 토큰 전달하여 SSO 완료
    const ssoCompleteResponse = await request.get(`${SALESHUB_API_URL}/auth/sso-complete`, {
      headers: {
        'Cookie': `wbhub_access_token=${hubManagerToken}`,
      },
      maxRedirects: 0, // 리다이렉트 자동 따라가지 않기
    });

    console.log(`📍 SSO Complete 응답 상태: ${ssoCompleteResponse.status()}`);

    // 리다이렉트 확인
    const ssoRedirectLocation = ssoCompleteResponse.headers()['location'];
    console.log(`📍 SSO Redirect Location: ${ssoRedirectLocation}`);

    if (ssoCompleteResponse.status() === 302 || ssoCompleteResponse.status() === 307) {
      if (ssoRedirectLocation) {
        console.log(`✅ SSO 리다이렉트 확인: ${ssoRedirectLocation}`);

        // 로그인 페이지로 리다이렉트되면 실패
        if (ssoRedirectLocation.includes('/login')) {
          console.error(`❌ SSO 실패 - 로그인 페이지로 리다이렉트됨`);
          console.log(`   에러 파라미터: ${new URL(ssoRedirectLocation, SALESHUB_API_URL).searchParams.get('error')}`);
          throw new Error(`SSO Complete가 로그인 페이지로 리다이렉트: ${ssoRedirectLocation}`);
        }

        // 대시보드로 리다이렉트되면 성공
        if (ssoRedirectLocation.includes('http://localhost:3010') || ssoRedirectLocation === '/') {
          console.log(`✅ SSO 성공 - 대시보드로 리다이렉트`);
          expect(ssoRedirectLocation).not.toContain('error');
        }
      }
    } else {
      const ssoResponseText = await ssoCompleteResponse.text();
      console.log(`📄 SSO Complete 응답 (처음 500자):\n${ssoResponseText.substring(0, 500)}`);
      console.error(`❌ SSO 실패 - 예상치 못한 상태 코드: ${ssoCompleteResponse.status()}`);
      throw new Error(`SSO Complete 실패: ${ssoCompleteResponse.status()}`);
    }

    console.log('✅ SSO 토큰 검증 성공!');
  });

  test('/auth/me 엔드포인트 JWT 토큰 검증 테스트', async ({ request }) => {
    console.log('\n🔍 JWT 토큰으로 /auth/me 엔드포인트 테스트');

    // 1. Dev-login으로 JWT 토큰 획득
    const devLoginResponse = await request.get(`${SALESHUB_API_URL}/auth/dev-login`, {
      maxRedirects: 0,
    });

    const location = devLoginResponse.headers()['location'];
    if (!location) {
      throw new Error('Dev-login에서 리다이렉트 URL을 받지 못했습니다.');
    }

    const redirectUrl = new URL(location, 'http://localhost:3010');
    const accessToken = redirectUrl.searchParams.get('accessToken');

    console.log(`🔐 Access Token: ${accessToken?.substring(0, 50)}...`);

    if (!accessToken) {
      throw new Error('AccessToken을 받지 못했습니다.');
    }

    // 2. /auth/me 엔드포인트 호출
    const meResponse = await request.get(`${SALESHUB_API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log(`📍 /auth/me 응답 상태: ${meResponse.status()}`);

    const meData = await meResponse.json();
    console.log(`📄 /auth/me 응답:`, JSON.stringify(meData, null, 2));

    // 검증
    expect(meResponse.status()).toBe(200);
    expect(meData.isAuthenticated).toBe(true);
    expect(meData.role).toBeTruthy();
    expect(meData.status).toBe('ACTIVE');

    console.log('✅ JWT 토큰 검증 성공!');
    console.log(`   - Role: ${meData.role}`);
    console.log(`   - Status: ${meData.status}`);
  });

  test('쿠키 기반 /auth/me 엔드포인트 테스트 (SSO 시뮬레이션)', async ({ request }) => {
    console.log('\n🔍 Step 1: HubManager에서 JWT 토큰 획득');

    // 1. HubManager dev-login으로 토큰 획득
    const hubManagerDevLogin = await request.get(`${HUBMANAGER_API_URL}/auth/dev-login`);
    const devLoginData = await hubManagerDevLogin.json();

    if (!devLoginData.success || !devLoginData.data?.token) {
      throw new Error('HubManager dev-login에서 토큰을 받지 못했습니다.');
    }

    const hubManagerToken = devLoginData.data.token;
    console.log(`🔐 HubManager Token: ${hubManagerToken?.substring(0, 50)}...`);

    console.log('\n🔍 Step 2: 쿠키로 /auth/me 엔드포인트 호출');

    // 2. 쿠키로 /auth/me 호출 (SSO 플로우 시뮬레이션)
    const meResponse = await request.get(`${SALESHUB_API_URL}/auth/me`, {
      headers: {
        'Cookie': `wbhub_access_token=${hubManagerToken}`,
      },
    });

    console.log(`📍 /auth/me 응답 상태: ${meResponse.status()}`);

    if (meResponse.status() !== 200) {
      const errorData = await meResponse.json();
      console.error(`❌ /auth/me 실패:`, JSON.stringify(errorData, null, 2));
      throw new Error(`/auth/me 실패: ${JSON.stringify(errorData)}`);
    }

    const meData = await meResponse.json();
    console.log(`📄 /auth/me 응답:`, JSON.stringify(meData, null, 2));

    // 검증
    expect(meResponse.status()).toBe(200);
    expect(meData.isAuthenticated).toBe(true);
    expect(meData.user.role).toBeTruthy();
    expect(meData.user.status).toBe('ACTIVE');

    console.log('✅ 쿠키 기반 JWT 토큰 검증 성공!');
    console.log(`   - Role: ${meData.user.role}`);
    console.log(`   - Status: ${meData.user.status}`);
  });
});
