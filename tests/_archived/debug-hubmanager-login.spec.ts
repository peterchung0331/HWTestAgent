import { test } from '@playwright/test';

test('허브매니저 로그인 페이지 디버깅', async ({ page }) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const logs: string[] = [];
  
  // 콘솔 메시지 캡처
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', text);
      errors.push(text);
    } else if (msg.type() === 'warning') {
      console.log('⚠️ Console Warning:', text);
      warnings.push(text);
    } else {
      console.log('📝 Console Log:', text);
      logs.push(text);
    }
  });
  
  // 네트워크 실패 캡처
  page.on('requestfailed', request => {
    console.log('❌ Request Failed:', request.url(), request.failure()?.errorText);
  });
  
  // 페이지 오류 캡처
  page.on('pageerror', error => {
    console.log('❌ Page Error:', error.message);
    errors.push(error.message);
  });
  
  console.log('\n=== 허브매니저 로그인 페이지 접속 ===');
  const response = await page.goto('http://localhost:3090/login?app=finhub&redirect=%2Flogin', {
    waitUntil: 'networkidle',
    timeout: 10000
  });
  
  console.log('Status:', response?.status());
  console.log('URL:', page.url());
  
  // 페이지 HTML 확인
  const html = await page.content();
  console.log('\n=== HTML 길이 ===', html.length);
  
  // body 내용 확인
  const bodyText = await page.locator('body').textContent();
  console.log('\n=== Body 텍스트 ===');
  console.log(bodyText?.substring(0, 500));
  
  // 스크린샷
  await page.screenshot({ path: '/tmp/hubmanager-login-debug.png', fullPage: true });
  
  console.log('\n=== 요약 ===');
  console.log('Errors:', errors.length);
  console.log('Warnings:', warnings.length);
  console.log('Logs:', logs.length);
});
