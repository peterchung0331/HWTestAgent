/**
 * pending-approval 페이지 빠른 확인 테스트
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const screenshotDir = `/home/peterchung/HWTestAgent/test-results/MyTester/screenshots/${new Date().toISOString().split('T')[0]}-quick-check`;

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

test.describe('pending-approval 페이지 확인', () => {
  test('SalesHub pending-approval 페이지 스크린샷', async ({ page }) => {
    await page.goto('http://localhost:4400/saleshub/pending-approval', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotDir, 'saleshub-pending-approval.png'), fullPage: true });

    const pageContent = await page.content();
    console.log('Page URL:', page.url());
    console.log('Has 승인 대기:', pageContent.includes('승인 대기'));
    console.log('Has pending:', pageContent.includes('pending') || pageContent.includes('Pending'));
  });

  test('FinHub pending-approval 페이지 스크린샷', async ({ page }) => {
    await page.goto('http://localhost:4400/finhub/pending-approval', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotDir, 'finhub-pending-approval.png'), fullPage: true });

    const pageContent = await page.content();
    console.log('Page URL:', page.url());
    console.log('Has 승인 대기:', pageContent.includes('승인 대기'));
  });

  test('OnboardingHub pending-approval 페이지 스크린샷', async ({ page }) => {
    await page.goto('http://localhost:4400/onboarding/pending-approval', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotDir, 'onboardinghub-pending-approval.png'), fullPage: true });

    const pageContent = await page.content();
    console.log('Page URL:', page.url());
    console.log('Has 승인 대기:', pageContent.includes('승인 대기'));
  });
});
