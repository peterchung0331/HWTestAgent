/**
 * 권한 제어 테스트용 스크린샷 캡처
 */
import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const screenshotDir = '/home/peterchung/HWTestAgent/test-results/MyTester/screenshots';

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

test.describe('스크린샷 캡처', () => {
  test('SalesHub 로그인 페이지', async ({ page }) => {
    await page.goto('http://localhost:4400/saleshub/login', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotDir, '01-saleshub-login.png'), fullPage: true });
    console.log('✅ SalesHub 로그인 페이지 캡처 완료');
  });

  test('FinHub 로그인 페이지', async ({ page }) => {
    await page.goto('http://localhost:4400/finhub/login', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotDir, '02-finhub-login.png'), fullPage: true });
    console.log('✅ FinHub 로그인 페이지 캡처 완료');
  });

  test('HubManager 허브 선택 페이지', async ({ page }) => {
    await page.goto('http://localhost:4400/hubs', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotDir, '03-hubmanager-hubs.png'), fullPage: true });
    console.log('✅ HubManager 허브 선택 페이지 캡처 완료');
  });

  test('pending-approval 페이지 접근 시도', async ({ page }) => {
    await page.goto('http://localhost:4400/saleshub/pending-approval', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotDir, '04-pending-approval-redirect.png'), fullPage: true });
    console.log(`📍 최종 URL: ${page.url()}`);
  });
});
