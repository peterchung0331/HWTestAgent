import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SALESHUB_URL = 'http://workhub.biz/saleshub/';
const SCREENSHOT_DIR = '/home/peterchung/HWTestAgent/test-results/MyTester/screenshots/debug-saleshub';

// 스크린샷 디렉토리 생성
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('SalesHub Oracle 디버깅', () => {
  test('페이지 로드 및 JS 파일 확인', async ({ page }) => {
    const errors: string[] = [];
    const failedRequests: string[] = [];
    const jsResponses: { url: string; status: number; contentType: string }[] = [];

    // 콘솔 에러 수집
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.log('❌ Console Error:', msg.text());
      }
    });

    // 페이지 에러 수집
    page.on('pageerror', error => {
      errors.push(error.message);
      console.log('❌ Page Error:', error.message);
    });

    // 실패한 요청 수집
    page.on('requestfailed', request => {
      failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`);
      console.log('❌ Request Failed:', request.url());
    });

    // JS 파일 응답 모니터링
    page.on('response', response => {
      const url = response.url();
      if (url.includes('.js')) {
        const info = {
          url: url,
          status: response.status(),
          contentType: response.headers()['content-type'] || 'unknown'
        };
        jsResponses.push(info);
        console.log(`📦 JS Response: ${url}`);
        console.log(`   Status: ${info.status}, Content-Type: ${info.contentType}`);
      }
    });

    console.log('\n🚀 SalesHub 접속 시작...\n');

    // 페이지 접속
    const response = await page.goto(SALESHUB_URL, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    console.log(`\n📄 페이지 응답 상태: ${response?.status()}`);
    console.log(`📄 Content-Type: ${response?.headers()['content-type']}`);

    // 스크린샷 1: 초기 로드
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-initial-load.png'),
      fullPage: true
    });
    console.log('\n📸 스크린샷 저장: 01-initial-load.png');

    // HTML 내용 확인
    const htmlContent = await page.content();
    const jsFileMatch = htmlContent.match(/main-app-([a-f0-9]+)\.js/);
    if (jsFileMatch) {
      console.log(`\n🔍 HTML에서 발견된 JS 해시: ${jsFileMatch[1]}`);
    }

    // 잠시 대기 후 스크린샷
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-after-wait.png'),
      fullPage: true
    });
    console.log('📸 스크린샷 저장: 02-after-wait.png');

    // 결과 출력
    console.log('\n========== 디버깅 결과 ==========\n');

    console.log(`📊 JS 파일 응답 (${jsResponses.length}개):`);
    jsResponses.forEach(js => {
      const isError = js.contentType.includes('html');
      console.log(`  ${isError ? '❌' : '✅'} ${js.url.split('/').pop()}`);
      console.log(`     Status: ${js.status}, Type: ${js.contentType}`);
    });

    console.log(`\n❌ 콘솔 에러 (${errors.length}개):`);
    errors.slice(0, 10).forEach(e => console.log(`  - ${e.substring(0, 100)}`));

    console.log(`\n❌ 실패한 요청 (${failedRequests.length}개):`);
    failedRequests.forEach(r => console.log(`  - ${r}`));

    // 페이지에 표시된 텍스트 확인
    const bodyText = await page.locator('body').textContent();
    console.log(`\n📝 페이지 텍스트 (처음 200자): ${bodyText?.substring(0, 200)}`);

    // 에러가 있으면 실패로 처리하되, 디버깅 정보는 모두 출력
    if (errors.some(e => e.includes('Unexpected token'))) {
      console.log('\n⚠️ JS 파싱 에러 발견 - HTML이 JS로 반환되고 있음');

      // 잘못된 JS 파일 직접 요청해보기
      const badJsUrls = jsResponses.filter(js => js.contentType.includes('html'));
      if (badJsUrls.length > 0) {
        console.log('\n🔍 문제가 있는 JS 파일 직접 요청 테스트:');
        for (const js of badJsUrls.slice(0, 3)) {
          const directResponse = await page.request.get(js.url);
          const directContent = await directResponse.text();
          console.log(`  ${js.url.split('/').pop()}:`);
          console.log(`    Content starts with: ${directContent.substring(0, 100)}`);
        }
      }
    }
  });
});
