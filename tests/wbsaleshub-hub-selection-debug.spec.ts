import { test, expect } from '@playwright/test';
import * as fs from 'fs';

/**
 * WBSalesHub 허브 선택 디버깅 테스트
 *
 * 문제: 허브 선택 화면에서 세일즈허브 선택 시 다시 선택 화면으로 돌아옴
 * 목표: 세일즈허브로 성공적으로 이동할 때까지 반복 디버깅
 */

test.describe('WBSalesHub Hub Selection Debug', () => {
  test.beforeEach(async ({ page }) => {
    // 네트워크 및 콘솔 모니터링
    page.on('requestfailed', request => {
      console.log('❌ Request failed:', request.url(), request.failure()?.errorText);
    });
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.log('❌ Console Error:', text);
      } else if (type === 'warning') {
        console.log('⚠️  Console Warning:', text);
      } else if (text.includes('Cookie') || text.includes('auth') || text.includes('redirect')) {
        console.log(`📋 Console ${type}:`, text);
      }
    });
    page.on('response', async response => {
      const url = response.url();
      const status = response.status();
      if (url.includes('/auth/') || url.includes('saleshub')) {
        console.log(`📡 Response: ${status} ${url}`);
        if (status === 302 || status === 301) {
          const location = response.headers()['location'];
          console.log(`  ↪️  Redirect to: ${location}`);
        }
      }
    });
  });

  test('허브 선택 → 세일즈허브 이동 디버깅', async ({ page, context }) => {
    console.log('\n🔍 Step 1: HubManager 허브 선택 페이지 접속');

    // 1. 허브 선택 페이지 접속
    await page.goto('http://localhost:3090/hubs');
    await page.waitForLoadState('networkidle');

    // 스크린샷 저장
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/hub-selection-01-initial.png',
      fullPage: true
    });

    console.log('📸 스크린샷 저장: hub-selection-01-initial.png');

    // 현재 쿠키 확인
    const cookies = await context.cookies();
    console.log('\n🍪 현재 쿠키 목록:');
    cookies.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 50)}... (domain: ${cookie.domain})`);
    });

    // 2. 세일즈허브 선택 버튼/링크 찾기
    console.log('\n🔍 Step 2: 세일즈허브 카드 찾기');

    // Sales Hub 텍스트를 포함하는 카드 찾기 (role="button"인 div)
    const salesHubCard = page.locator('[role="button"][aria-label*="Sales Hub"]');

    if (await salesHubCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Sales Hub 카드 발견');

      const salesHubButton = salesHubCard;
        const buttonText = await salesHubButton.textContent();
        console.log(`  텍스트: ${buttonText}`);

        // 스크린샷
        await page.screenshot({
          path: '/home/peterchung/HWTestAgent/test-results/hub-selection-02-before-click.png',
          fullPage: true
        });

        // 3. 세일즈허브 클릭
        console.log('\n🔍 Step 3: 세일즈허브 클릭');

        // 네비게이션 이벤트 추적
        const navigationPromise = page.waitForNavigation({ timeout: 10000 }).catch(() => null);

        await salesHubButton.click();
        console.log('✅ 클릭 완료');

        // 네비게이션 대기
        await navigationPromise;

        // 잠시 대기
        await page.waitForTimeout(2000);

        // 4. 현재 URL 확인
        const currentUrl = page.url();
        console.log(`\n📍 현재 URL: ${currentUrl}`);

        // 스크린샷
        await page.screenshot({
          path: '/home/peterchung/HWTestAgent/test-results/hub-selection-03-after-click.png',
          fullPage: true
        });

        // 5. 결과 분석
        if (currentUrl.includes('saleshub') || currentUrl.includes('3010')) {
          console.log('✅ 성공: 세일즈허브로 이동됨');

          // 대시보드 확인
          await page.waitForLoadState('networkidle');
          const title = await page.title();
          console.log(`  페이지 타이틀: ${title}`);

          // 최종 스크린샷
          await page.screenshot({
            path: '/home/peterchung/HWTestAgent/test-results/hub-selection-04-success.png',
            fullPage: true
          });
        } else if (currentUrl.includes('/hubs')) {
          console.log('❌ 실패: 허브 선택 화면으로 돌아옴');
          console.log('🔍 문제 진단 시작...');

          // 쿠키 재확인
          const cookiesAfter = await context.cookies();
          console.log('\n🍪 클릭 후 쿠키:');
          cookiesAfter.forEach(cookie => {
            console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
          });

          // /auth/me 엔드포인트 테스트
          console.log('\n🔍 /auth/me 엔드포인트 테스트:');
          const authMeResponse = await page.goto('http://localhost:4010/auth/me');
          const authMeStatus = authMeResponse?.status();
          console.log(`  응답 상태: ${authMeStatus}`);

          if (authMeStatus === 200) {
            const authMeBody = await authMeResponse?.json();
            console.log(`  응답 본문:`, authMeBody);
          }

          // 에러 메시지 확인
          const errorMessage = await page.locator('text=/error|fail|invalid/i').first().textContent().catch(() => null);
          if (errorMessage) {
            console.log(`\n⚠️  에러 메시지 발견: ${errorMessage}`);
          }

        } else {
          console.log(`⚠️  예상치 못한 URL: ${currentUrl}`);
        }

    } else {
      console.log('❌ Sales Hub 카드를 찾을 수 없음');

      // 페이지 HTML 저장
      const htmlContent = await page.content();
      fs.writeFileSync('/home/peterchung/HWTestAgent/test-results/hub-page-not-found.html', htmlContent);
      console.log('  디버깅용 HTML 저장: hub-page-not-found.html');
    }
  });
});
