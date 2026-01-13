import { test, expect } from '@playwright/test';

/**
 * WBFinHub Core API 테스트
 *
 * 목적: 핀허브의 주요 API 엔드포인트가 정상 작동하는지 검증
 * 범위: 인증, 계정, 엔티티, 거래 등 핵심 API
 */

const BASE_URL = 'http://localhost:4020';

test.describe('WBFinHub Core API Tests', () => {
  test('1. Health Check API', async ({ request }) => {
    console.log('📝 Testing /api/health...');

    const response = await request.get(`${BASE_URL}/api/health`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    console.log('✅ Health check passed:', data);
    expect(data.success).toBe(true);
    expect(data.port).toBe('4020');
    expect(data.message).toContain('WBFinHub');
  });

  test('2. Accounts API - 인증 필요', async ({ request }) => {
    console.log('📝 Testing /api/accounts (unauthorized)...');

    const response = await request.get(`${BASE_URL}/api/accounts`);

    expect(response.status()).toBe(401);
    const data = await response.json();

    console.log('✅ Accounts API requires authentication:', data);
    expect(data.success).toBe(false);
  });

  test('3. Entities API - 인증 필요', async ({ request }) => {
    console.log('📝 Testing /api/entities (unauthorized)...');

    const response = await request.get(`${BASE_URL}/api/entities`);

    expect(response.status()).toBe(401);
    const data = await response.json();

    console.log('✅ Entities API requires authentication:', data);
    expect(data.success).toBe(false);
  });

  test('4. Transactions API - 인증 필요', async ({ request }) => {
    console.log('📝 Testing /api/transactions (unauthorized)...');

    const response = await request.get(`${BASE_URL}/api/transactions`);

    expect(response.status()).toBe(401);
    const data = await response.json();

    console.log('✅ Transactions API requires authentication:', data);
    expect(data.success).toBe(false);
  });

  test('5. Wallets API - 인증 필요', async ({ request }) => {
    console.log('📝 Testing /api/wallets (unauthorized)...');

    const response = await request.get(`${BASE_URL}/api/wallets`);

    expect(response.status()).toBe(401);
    const data = await response.json();

    console.log('✅ Wallets API requires authentication:', data);
    expect(data.success).toBe(false);
  });

  test('6. Dashboard API - 인증 필요', async ({ request }) => {
    console.log('📝 Testing /api/dashboard/overview (unauthorized)...');

    const response = await request.get(`${BASE_URL}/api/dashboard/overview`);

    expect(response.status()).toBe(401);
    const data = await response.json();

    console.log('✅ Dashboard API requires authentication:', data);
    expect(data.success).toBe(false);
  });

  test('7. Deals API - 인증 필요', async ({ request }) => {
    console.log('📝 Testing /api/deals (unauthorized)...');

    const response = await request.get(`${BASE_URL}/api/deals`);

    expect(response.status()).toBe(401);
    const data = await response.json();

    console.log('✅ Deals API requires authentication:', data);
    expect(data.success).toBe(false);
  });

  test('8. Deal Transactions API - 인증 필요', async ({ request }) => {
    console.log('📝 Testing /api/deal-transactions (unauthorized)...');

    const response = await request.get(`${BASE_URL}/api/deal-transactions`);

    expect(response.status()).toBe(401);
    const data = await response.json();

    console.log('✅ Deal Transactions API requires authentication:', data);
    expect(data.success).toBe(false);
  });

  test('9. Reports API - 인증 필요', async ({ request }) => {
    console.log('📝 Testing /api/reports (unauthorized)...');

    const response = await request.get(`${BASE_URL}/api/reports`);

    expect(response.status()).toBe(401);
    const data = await response.json();

    console.log('✅ Reports API requires authentication:', data);
    expect(data.success).toBe(false);
  });

  test('10. Sales Leads API - 인증 필요', async ({ request }) => {
    console.log('📝 Testing /api/sales-leads (unauthorized)...');

    const response = await request.get(`${BASE_URL}/api/sales-leads`);

    expect(response.status()).toBe(401);
    const data = await response.json();

    console.log('✅ Sales Leads API requires authentication:', data);
    expect(data.success).toBe(false);
  });

  test('11. CORS 헤더 검증', async ({ request }) => {
    console.log('📝 Testing CORS headers...');

    const response = await request.get(`${BASE_URL}/api/health`, {
      headers: {
        'Origin': 'http://localhost:3020'
      }
    });

    expect(response.ok()).toBeTruthy();
    const headers = response.headers();

    console.log('✅ CORS configured correctly');
    expect(headers['access-control-allow-credentials']).toBe('true');
  });

  test('12. 잘못된 엔드포인트 404 처리', async ({ request }) => {
    console.log('📝 Testing 404 handling...');

    const response = await request.get(`${BASE_URL}/api/nonexistent-endpoint`);

    expect(response.status()).toBe(404);

    console.log('✅ 404 handled correctly');
  });
});
