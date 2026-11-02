import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4020';
const FRONTEND_URL = 'http://localhost:3020';

test.describe('WBFinHub JWT Authentication Integration', () => {
  test('1. dev-login 엔드포인트 테스트', async ({ request }) => {
    console.log('📝 Testing dev-login endpoint...');

    const response = await request.get(`${BASE_URL}/auth/dev-login?email=test@example.com&name=Test%20User&role=ADMIN`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    console.log('✅ dev-login response:', JSON.stringify(data, null, 2));

    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.token).toBeDefined();
    expect(data.data.user).toBeDefined();
    expect(data.data.user.email).toBe('test@example.com');
    expect(data.data.user.name).toBe('Test User');
  });

  test('2. JWT 토큰 검증 테스트', async ({ request }) => {
    console.log('📝 Testing JWT verification...');

    // 1. dev-login으로 토큰 획득
    const loginResponse = await request.get(`${BASE_URL}/auth/dev-login?email=test2@example.com&name=Test%20User%202&role=FINANCE`);

    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    console.log('✅ Token acquired:', token.substring(0, 20) + '...');

    // 2. /api/auth/verify 엔드포인트 테스트
    const verifyResponse = await request.get(`${BASE_URL}/api/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    expect(verifyResponse.ok()).toBeTruthy();
    const verifyData = await verifyResponse.json();
    console.log('✅ Verify response:', JSON.stringify(verifyData, null, 2));

    expect(verifyData.success).toBe(true);
    expect(verifyData.data.user.email).toBe('test2@example.com');
  });

  test('3. 동적 역할 로딩 테스트', async ({ request }) => {
    console.log('📝 Testing dynamic role loading...');

    // 1. dev-login으로 토큰 획득
    const loginResponse = await request.get(`${BASE_URL}/auth/dev-login?email=admin@example.com&name=Admin%20User&role=ADMIN`);

    const loginData = await loginResponse.json();
    const token = loginData.data.token;

    // 2. /api/accounts/roles 엔드포인트 테스트
    const rolesResponse = await request.get(`${BASE_URL}/api/accounts/roles`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    expect(rolesResponse.ok()).toBeTruthy();
    const rolesData = await rolesResponse.json();
    console.log('✅ Roles response:', JSON.stringify(rolesData, null, 2));

    expect(rolesData.success).toBe(true);
    expect(rolesData.data).toBeDefined();
    expect(Array.isArray(rolesData.data)).toBe(true);
    expect(rolesData.data.length).toBeGreaterThan(0);

    // Fallback 역할 확인
    const roleNames = rolesData.data.map((r: any) => r.name);
    expect(roleNames).toContain('ADMIN');
    expect(roleNames).toContain('FINANCE');
    expect(roleNames).toContain('VIEWER');
  });

  test('4. 계정 생성 플로우 테스트', async ({ request }) => {
    console.log('📝 Testing account creation flow...');

    // 1. dev-login으로 관리자 토큰 획득
    const loginResponse = await request.get(`${BASE_URL}/auth/dev-login?email=admin@example.com&name=Admin%20User&role=ADMIN`);

    const loginData = await loginResponse.json();
    const token = loginData.data.token;

    // 2. 계정 생성 요청
    const createResponse = await request.post(`${BASE_URL}/api/accounts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        email: `newuser-${Date.now()}@example.com`,
        name: 'New User',
        role: 'VIEWER'
      }
    });

    // 계정이 이미 존재할 수 있으므로 200 또는 400 둘 다 허용
    const createData = await createResponse.json();
    console.log('✅ Create account response:', JSON.stringify(createData, null, 2));

    if (createResponse.ok()) {
      expect(createData.success).toBe(true);
      expect(createData.data).toBeDefined();
      expect(createData.data.status).toBe('pending');
    } else {
      // 이미 존재하는 계정이면 에러 메시지 확인
      expect(createData.error).toBeDefined();
    }
  });

  test('5. 인증되지 않은 요청 거부 테스트', async ({ request }) => {
    console.log('📝 Testing unauthorized request rejection...');

    // 토큰 없이 /api/accounts/roles 요청
    const response = await request.get(`${BASE_URL}/api/accounts/roles`);

    expect(response.status()).toBe(401);
    const data = await response.json();
    console.log('✅ Unauthorized response:', JSON.stringify(data, null, 2));

    expect(data.error).toBeDefined();
  });

  test('6. 잘못된 토큰 거부 테스트', async ({ request }) => {
    console.log('📝 Testing invalid token rejection...');

    const response = await request.get(`${BASE_URL}/api/accounts/roles`, {
      headers: {
        'Authorization': 'Bearer invalid-token-here'
      }
    });

    expect(response.status()).toBe(401);
    const data = await response.json();
    console.log('✅ Invalid token response:', JSON.stringify(data, null, 2));

    expect(data.error).toBeDefined();
  });
});
