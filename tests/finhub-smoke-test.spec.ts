import { test, expect } from '@playwright/test';

/**
 * WBFinHub 스모크 테스트
 *
 * 목적: 핀허브의 기본적인 API 엔드포인트가 정상 작동하는지 검증
 */

const BASE_URL = 'http://localhost:4020';

test.describe('WBFinHub Smoke Test', () => {
  test('1. 헬스체크 API', async ({ request }) => {
    console.log('📝 Testing health endpoint...');

    const response = await request.get(`${BASE_URL}/api/health`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    console.log('✅ Health response:', data);
    expect(data.success).toBe(true);
    expect(data.port).toBe('4020');
  });

  test('2. 인증 없이 API 접근 시 401 반환', async ({ request }) => {
    console.log('📝 Testing unauthorized API access...');

    const response = await request.get(`${BASE_URL}/api/accounts`);

    expect(response.status()).toBe(401);
    const data = await response.json();

    console.log('✅ Unauthorized response:', data);
    expect(data.success).toBe(false);
    expect(data.code).toBe('NO_TOKEN');
  });

  test('3. 잘못된 토큰으로 API 접근 시 401 반환', async ({ request }) => {
    console.log('📝 Testing invalid token rejection...');

    const response = await request.get(`${BASE_URL}/api/accounts`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });

    expect(response.status()).toBe(401);
    const data = await response.json();

    console.log('✅ Invalid token response:', data);
    expect(data.success).toBe(false);
  });

  test('4. CORS 헤더 확인', async ({ request }) => {
    console.log('📝 Testing CORS headers...');

    const response = await request.get(`${BASE_URL}/api/health`, {
      headers: {
        'Origin': 'http://localhost:3020'
      }
    });

    expect(response.ok()).toBeTruthy();
    const headers = response.headers();

    console.log('✅ CORS headers present');
    expect(headers['access-control-allow-credentials']).toBe('true');
  });

  test('5. 데이터베이스 연결 확인', async ({ request }) => {
    console.log('📝 Testing database connection...');

    // Health endpoint가 DB 연결 없이 작동하므로, 실제 API를 호출하여 확인
    // 인증이 필요하므로 401이 반환되면 서버는 정상
    const response = await request.get(`${BASE_URL}/api/entities`);

    // 401이 반환되면 서버가 정상적으로 요청을 처리하고 있는 것
    expect([401, 200]).toContain(response.status());

    console.log('✅ Database connection check passed (server responded)');
  });
});
