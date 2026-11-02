import { test, expect } from '@playwright/test';

test('debug testagent until working', async ({ page }) => {
  // 콘솔 및 네트워크 모니터링
  const logs: string[] = [];

  page.on('console', msg => {
    const text = `[Console ${msg.type()}] ${msg.text()}`;
    console.log(text);
    logs.push(text);
  });

  page.on('requestfailed', request => {
    const text = `[Request Failed] ${request.url()} - ${request.failure()?.errorText}`;
    console.log(text);
    logs.push(text);
  });

  page.on('response', async response => {
    if (response.url().includes('/api/') || response.url().includes('/testagent')) {
      const status = response.status();
      const url = response.url();
      console.log(`[Response] ${status} ${url}`);

      if (status >= 400) {
        try {
          const body = await response.text();
          console.log(`[Error Body] ${body.substring(0, 200)}`);
        } catch (e) {
          // ignore
        }
      }
    }
  });

  // 페이지 접속
  console.log('\n=== Navigating to http://workhub.biz/testagent ===\n');
  await page.goto('http://workhub.biz/testagent', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // 3초 대기
  await page.waitForTimeout(3000);

  // 스크린샷
  await page.screenshot({ path: '/tmp/testagent-debug.png', fullPage: true });
  console.log('\n📸 Screenshot saved to /tmp/testagent-debug.png');

  // 페이지 내용 확인
  const bodyText = await page.textContent('body');
  console.log('\n=== Page Content (first 500 chars) ===');
  console.log(bodyText?.substring(0, 500));

  // Loading 상태 확인
  const loadingText = await page.locator('text=Loading dashboard').count();
  console.log(`\n"Loading dashboard" elements: ${loadingText}`);

  // API 호출 직접 확인
  console.log('\n=== Testing API directly ===');
  const apiResponse = await page.evaluate(async () => {
    try {
      const res = await fetch('/testagent/api/playwright/status');
      const data = await res.json();
      return { status: res.status, data };
    } catch (error) {
      return { error: String(error) };
    }
  });
  console.log('API Response:', JSON.stringify(apiResponse, null, 2));
});
