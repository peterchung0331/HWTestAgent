import { test, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// 환경변수 로드
dotenv.config();

const BASE_URL = process.env.TEST_URL_ORACLE || 'http://158.180.95.246:4400';
const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'debug-network');

// 스크린샷 디렉토리 생성
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Network Debug Test', () => {
  test.setTimeout(180000);

  test('Debug /hubs page network requests', async ({ page }) => {
    console.log('🚀 Starting Network Debug Test...');
    console.log(`📍 Base URL: ${BASE_URL}`);

    // 네트워크 요청/응답 로깅
    const failedRequests: any[] = [];
    const allRequests: any[] = [];

    page.on('request', request => {
      allRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
      console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
    });

    page.on('response', async response => {
      const status = response.status();
      const url = response.url();
      console.log(`📥 RESPONSE: ${status} ${url}`);

      if (status >= 400) {
        console.log(`❌ FAILED RESPONSE: ${status} ${url}`);
        try {
          const body = await response.text();
          console.log(`   Body: ${body.substring(0, 200)}`);
        } catch (e) {
          console.log(`   (Could not read body)`);
        }
        failedRequests.push({ url, status });
      }
    });

    page.on('requestfailed', request => {
      console.log(`❌ REQUEST FAILED: ${request.url()}`);
      console.log(`   Failure: ${request.failure()?.errorText}`);
      failedRequests.push({
        url: request.url(),
        error: request.failure()?.errorText
      });
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
      }
    });

    // 1. /hubs 페이지 접속
    console.log('\n📊 Accessing /hubs page...');
    try {
      await page.goto(`${BASE_URL}/hubs`, {
        waitUntil: 'networkidle',
        timeout: 60000
      });
    } catch (e: any) {
      console.log(`⚠️  Navigation completed with error: ${e.message}`);
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-hubs-page.png'), fullPage: true });

    // 2. 페이지 상태 확인
    console.log('\n📊 Page State:');
    console.log(`   Title: ${await page.title()}`);
    console.log(`   URL: ${page.url()}`);

    const bodyText = await page.textContent('body');
    console.log(`   Body text (first 200 chars): ${bodyText?.substring(0, 200)}`);

    // 3. 실패한 요청 요약
    console.log('\n📊 Failed Requests Summary:');
    if (failedRequests.length === 0) {
      console.log('   ✅ No failed requests');
    } else {
      failedRequests.forEach((req, index) => {
        console.log(`   ${index + 1}. ${req.url}`);
        console.log(`      Status/Error: ${req.status || req.error}`);
      });
    }

    // 4. 모든 요청 요약
    console.log('\n📊 All Requests Summary:');
    console.log(`   Total requests: ${allRequests.length}`);
    const apiRequests = allRequests.filter(r => r.url.includes('/api/'));
    console.log(`   API requests: ${apiRequests.length}`);
    apiRequests.forEach(req => {
      console.log(`      ${req.method} ${req.url}`);
    });
  });
});
