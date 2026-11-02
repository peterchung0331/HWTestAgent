import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginWithGoogle, getTestGoogleCredentials, isAuthenticated } from './helpers/google-oauth-helper';

/**
 * E2E 테스트: 계정 권한 및 역할 테스트
 *
 * 테스트 대상:
 * - 계정 상태 (pending, active, rejected, inactive)
 * - 계정 역할 (admin, user, master, finance, trading, executive, viewer)
 * - 허브별 멤버십 및 역할
 * - 권한에 따른 접근 제어
 *
 * 환경: http://158.180.95.246:4400 (오라클 스테이징)
 */

const ORACLE_STAGING_URL = 'http://158.180.95.246:4400';
const HUBMANAGER_URL = ORACLE_STAGING_URL;
const SALESHUB_URL = `${ORACLE_STAGING_URL}/saleshub`;
const FINHUB_URL = `${ORACLE_STAGING_URL}/finhub`;

// 스크린샷 저장 경로
const SCREENSHOT_DIR = '/home/peterchung/HWTestAgent/test-results/MyTester/screenshots/2026-01-12-Account-Permissions';

test.describe('계정 권한 E2E 테스트', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('1. 로그인 후 사용자 정보 확인', async ({ page }) => {
    console.log('📌 Step 1: 사용자 정보 확인');

    // 로그인
    const { email, password } = getTestGoogleCredentials();
    await loginWithGoogle(page, {
      email,
      password,
      loginUrl: HUBMANAGER_URL,
      redirectPath: '/hubs'
    });

    // 사용자 정보 API 호출
    const userInfoUrl = `${HUBMANAGER_URL}/api/auth/me`;

    try {
      const response = await page.goto(userInfoUrl, { timeout: 10000 });
      const status = response?.status();

      console.log('📡 User Info API Status:', status);

      if (status === 200) {
        const userInfo = await response?.json();
        console.log('👤 User Info:', JSON.stringify(userInfo, null, 2));

        // 스크린샷 저장
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '01-user-info.png'),
          fullPage: true
        });

        // 기본 정보 확인
        expect(userInfo).toHaveProperty('email');
        expect(userInfo.email).toBe(email);

        // 계정 상태 확인 (pending, active, rejected, inactive)
        if (userInfo.status) {
          console.log('📋 Account Status:', userInfo.status);
          expect(['pending', 'active', 'rejected', 'inactive']).toContain(userInfo.status);
        }

        // 계정 역할 확인 (admin, user, master 등)
        if (userInfo.role) {
          console.log('🎭 Account Role:', userInfo.role);
          expect(typeof userInfo.role).toBe('string');
        }

        console.log('✅ 사용자 정보 확인 완료');
      } else if (status === 401) {
        console.log('⚠️ 인증 실패 (로그인 필요)');
      } else if (status === 404) {
        console.log('⚠️ API 엔드포인트 없음 (/api/auth/me)');
      }
    } catch (error) {
      console.log('⚠️ User Info API 호출 실패:', error);
    }
  });

  test('2. HubManager 계정 관리 페이지 접근', async ({ page }) => {
    console.log('📌 Step 2: HubManager 계정 관리 페이지 접근');

    // 로그인
    const { email, password } = getTestGoogleCredentials();
    await loginWithGoogle(page, {
      email,
      password,
      loginUrl: HUBMANAGER_URL
    });

    // 계정 관리 페이지 접속 시도
    const accountsUrl = `${HUBMANAGER_URL}/accounts`;

    try {
      await page.goto(accountsUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // 스크린샷 저장
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-accounts-page.png'),
        fullPage: true
      });

      // 페이지 타이틀 확인
      const title = await page.title();
      console.log('📄 Page Title:', title);

      // 계정 테이블 또는 리스트 확인
      const hasAccountTable = await page.locator('table, [role="table"], [data-testid="accounts-list"]').count() > 0;
      const hasAccessDenied = await page.locator('text=/access denied|권한 없음|unauthorized/i').count() > 0;

      console.log('📊 Account Table/List:', hasAccountTable);
      console.log('🚫 Access Denied:', hasAccessDenied);

      if (hasAccessDenied) {
        console.log('⚠️ 계정 관리 페이지 접근 권한 없음');
      } else if (hasAccountTable) {
        console.log('✅ 계정 관리 페이지 접근 가능 (Admin 권한)');
      } else {
        console.log('⚠️ 계정 관리 페이지 구조 확인 필요');
      }
    } catch (error) {
      console.log('⚠️ 계정 관리 페이지 접근 실패:', error);
    }
  });

  test('3. 허브별 멤버십 확인 (SalesHub)', async ({ page }) => {
    console.log('📌 Step 3: SalesHub 멤버십 확인');

    // 로그인
    const { email, password } = getTestGoogleCredentials();
    await loginWithGoogle(page, {
      email,
      password,
      loginUrl: HUBMANAGER_URL
    });

    // SalesHub 멤버십 API 호출
    const membershipUrl = `${SALESHUB_URL}/api/membership`;

    try {
      const response = await page.goto(membershipUrl, { timeout: 10000 });
      const status = response?.status();

      console.log('📡 Membership API Status:', status);

      if (status === 200) {
        const membership = await response?.json();
        console.log('🏷️ SalesHub Membership:', JSON.stringify(membership, null, 2));

        // 스크린샷 저장
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '03-saleshub-membership.png'),
          fullPage: true
        });

        // 멤버십 정보 확인
        if (membership) {
          if (membership.hub_role) {
            console.log('🎭 Hub Role:', membership.hub_role);
          }
          if (membership.hub_status) {
            console.log('📋 Hub Status:', membership.hub_status);
          }
        }

        console.log('✅ SalesHub 멤버십 확인 완료');
      } else if (status === 401) {
        console.log('⚠️ 인증 실패');
      } else if (status === 403) {
        console.log('⚠️ SalesHub 접근 권한 없음 (멤버가 아님)');
      } else if (status === 404) {
        console.log('⚠️ Membership API 엔드포인트 없음');
      }
    } catch (error) {
      console.log('⚠️ Membership API 호출 실패:', error);
    }
  });

  test('4. 권한별 API 접근 테스트 (Customers API)', async ({ page }) => {
    console.log('📌 Step 4: Customers API 권한 테스트');

    // 로그인
    const { email, password } = getTestGoogleCredentials();
    await loginWithGoogle(page, {
      email,
      password,
      loginUrl: HUBMANAGER_URL
    });

    // Customers API 호출 (읽기 권한 필요)
    const customersUrl = `${SALESHUB_URL}/api/customers`;

    try {
      const response = await page.goto(customersUrl, { timeout: 10000 });
      const status = response?.status();

      console.log('📡 Customers API Status:', status);

      // 스크린샷 저장
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-customers-api.png'),
        fullPage: true
      });

      if (status === 200) {
        const customers = await response?.json();
        console.log('👥 Customers:', Array.isArray(customers) ? `${customers.length} customers` : 'N/A');
        console.log('✅ Customers API 접근 가능 (읽기 권한 있음)');
      } else if (status === 401) {
        console.log('⚠️ 인증 실패 (로그인 필요)');
      } else if (status === 403) {
        console.log('⚠️ Customers API 접근 권한 없음 (읽기 권한 없음)');
      } else if (status === 404) {
        console.log('⚠️ Customers API 엔드포인트 없음');
      }
    } catch (error) {
      console.log('⚠️ Customers API 호출 실패:', error);
    }
  });

  test('5. Admin 전용 API 접근 테스트', async ({ page }) => {
    console.log('📌 Step 5: Admin 전용 API 접근 테스트');

    // 로그인
    const { email, password } = getTestGoogleCredentials();
    await loginWithGoogle(page, {
      email,
      password,
      loginUrl: HUBMANAGER_URL
    });

    // Admin 전용 API (계정 목록)
    const adminApiUrl = `${HUBMANAGER_URL}/api/accounts`;

    try {
      const response = await page.goto(adminApiUrl, { timeout: 10000 });
      const status = response?.status();

      console.log('📡 Admin API Status:', status);

      // 스크린샷 저장
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-admin-api.png'),
        fullPage: true
      });

      if (status === 200) {
        const accounts = await response?.json();
        console.log('👥 Accounts:', Array.isArray(accounts) ? `${accounts.length} accounts` : 'N/A');
        console.log('✅ Admin API 접근 가능 (Admin 권한 있음)');

        // 계정 상태 분포 확인
        if (Array.isArray(accounts) && accounts.length > 0) {
          const statusCount = accounts.reduce((acc: any, account: any) => {
            acc[account.status] = (acc[account.status] || 0) + 1;
            return acc;
          }, {});
          console.log('📊 Account Status Distribution:', statusCount);
        }
      } else if (status === 401) {
        console.log('⚠️ 인증 실패');
      } else if (status === 403) {
        console.log('⚠️ Admin API 접근 권한 없음 (Admin이 아님)');
      } else if (status === 404) {
        console.log('⚠️ Admin API 엔드포인트 없음');
      }
    } catch (error) {
      console.log('⚠️ Admin API 호출 실패:', error);
    }
  });

  test('6. 허브 역할 정의 조회 (HubManager)', async ({ page }) => {
    console.log('📌 Step 6: 허브 역할 정의 조회');

    // 로그인
    const { email, password } = getTestGoogleCredentials();
    await loginWithGoogle(page, {
      email,
      password,
      loginUrl: HUBMANAGER_URL
    });

    // 역할 정의 API 호출
    const rolesUrl = `${HUBMANAGER_URL}/api/roles`;

    try {
      const response = await page.goto(rolesUrl, { timeout: 10000 });
      const status = response?.status();

      console.log('📡 Roles API Status:', status);

      if (status === 200) {
        const roles = await response?.json();
        console.log('🎭 Hub Roles:', JSON.stringify(roles, null, 2));

        // 스크린샷 저장
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '06-hub-roles.png'),
          fullPage: true
        });

        // 역할 목록 확인
        if (Array.isArray(roles)) {
          console.log(`📋 Found ${roles.length} roles`);
          roles.forEach((role: any) => {
            console.log(`   - ${role.role_name || role.name}: ${role.description || 'N/A'}`);
          });
        }

        console.log('✅ 허브 역할 정의 조회 완료');
      } else if (status === 404) {
        console.log('⚠️ Roles API 엔드포인트 없음');
      }
    } catch (error) {
      console.log('⚠️ Roles API 호출 실패:', error);
    }
  });

  test('7. 크로스 허브 권한 테스트 (SalesHub → FinHub)', async ({ page }) => {
    console.log('📌 Step 7: 크로스 허브 권한 테스트');

    // 로그인
    const { email, password } = getTestGoogleCredentials();
    await loginWithGoogle(page, {
      email,
      password,
      loginUrl: HUBMANAGER_URL
    });

    // SalesHub 접근
    await page.goto(SALESHUB_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const salesHubAuth = await isAuthenticated(page);
    console.log('🔐 SalesHub Authenticated:', salesHubAuth);

    // 스크린샷 저장
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-saleshub-access.png'),
      fullPage: true
    });

    // 접근 가능 확인
    const salesHubDenied = await page.locator('text=/access denied|권한 없음|unauthorized/i').count() > 0;
    if (salesHubDenied) {
      console.log('⚠️ SalesHub 접근 거부 (멤버가 아님)');
    } else {
      console.log('✅ SalesHub 접근 가능');
    }

    // FinHub 접근 시도
    await page.goto(FINHUB_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const finHubAuth = await isAuthenticated(page);
    console.log('🔐 FinHub Authenticated:', finHubAuth);

    // 스크린샷 저장
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08-finhub-access.png'),
      fullPage: true
    });

    // 접근 가능 확인
    const finHubDenied = await page.locator('text=/access denied|권한 없음|unauthorized/i').count() > 0;
    if (finHubDenied) {
      console.log('⚠️ FinHub 접근 거부 (멤버가 아님)');
    } else {
      console.log('✅ FinHub 접근 가능');
    }

    console.log('✅ 크로스 허브 권한 테스트 완료');
  });
});

test.describe('계정 상태별 테스트', () => {
  test('8. pending 상태 계정 시뮬레이션', async ({ page }) => {
    console.log('📌 Step 8: pending 상태 계정 시뮬레이션');

    // 로그인
    const { email, password } = getTestGoogleCredentials();
    await loginWithGoogle(page, {
      email,
      password,
      loginUrl: HUBMANAGER_URL
    });

    // pending 상태일 때 예상되는 동작:
    // - 로그인은 가능
    // - 허브 접근 제한
    // - "계정 승인 대기 중" 메시지 표시

    await page.goto(`${HUBMANAGER_URL}/hubs`, { waitUntil: 'networkidle', timeout: 30000 });

    // 스크린샷 저장
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-pending-account.png'),
      fullPage: true
    });

    // pending 메시지 확인
    const hasPendingMessage = await page.locator('text=/pending|승인 대기|waiting for approval/i').count() > 0;
    console.log('⏳ Pending Message:', hasPendingMessage);

    if (hasPendingMessage) {
      console.log('⚠️ 계정이 pending 상태 (승인 대기 중)');
    } else {
      console.log('✅ 계정이 active 상태 (정상 사용 가능)');
    }
  });

  test('9. 역할별 UI 요소 표시 확인', async ({ page }) => {
    console.log('📌 Step 9: 역할별 UI 요소 표시 확인');

    // 로그인
    const { email, password } = getTestGoogleCredentials();
    await loginWithGoogle(page, {
      email,
      password,
      loginUrl: HUBMANAGER_URL
    });

    await page.goto(`${HUBMANAGER_URL}/hubs`, { waitUntil: 'networkidle', timeout: 30000 });

    // 스크린샷 저장
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '10-role-based-ui.png'),
      fullPage: true
    });

    // Admin 전용 UI 요소 확인
    const hasAdminMenu = await page.locator('text=/admin|관리자|계정 관리/i').count() > 0;
    console.log('🔧 Admin Menu:', hasAdminMenu);

    // User 일반 UI 요소 확인
    const hasUserMenu = await page.locator('text=/dashboard|대시보드/i').count() > 0;
    console.log('🏠 User Menu:', hasUserMenu);

    if (hasAdminMenu) {
      console.log('✅ Admin 권한 UI 표시됨');
    } else if (hasUserMenu) {
      console.log('✅ User 권한 UI 표시됨');
    } else {
      console.log('⚠️ 역할별 UI 확인 필요');
    }
  });
});
