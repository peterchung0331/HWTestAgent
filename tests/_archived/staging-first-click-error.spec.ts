import { test, expect } from '@playwright/test';

test('Debug: First click after clearing data', async ({ page }) => {
  console.log('=== First Click Error Debug ===\n');

  // 모든 콘솔 로그 및 에러 캡처
  const consoleMessages: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    console.log(text);
  });

  page.on('pageerror', error => {
    const text = `❌ PAGE ERROR: ${error.message}`;
    errors.push(text);
    console.log(text);
  });

  page.on('requestfailed', request => {
    const text = `❌ REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`;
    errors.push(text);
    console.log(text);
  });

  // 데이터 클리어 (쿠키, 로컬스토리지, 세션스토리지)
  console.log('1️⃣ Clearing all data...');
  await page.context().clearCookies();
  await page.goto('https://staging.workhub.biz:4400/hubs');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  console.log('✅ Data cleared\n');

  // 페이지 새로고침
  console.log('2️⃣ Reloading page...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('text=Sales Hub', { timeout: 10000 });
  console.log('✅ Page loaded\n');

  // 3초 대기
  await page.waitForTimeout(3000);

  // 클릭 전 에러 상태 확인
  console.log('3️⃣ Errors before click:', errors.length);

  // 첫 클릭
  console.log('4️⃣ First click after data clear...');
  const urlBefore = page.url();

  const button = page.locator('text=대시보드로 이동').first();
  await button.click();
  console.log('✅ Click executed\n');

  // 2초 대기 (에러 발생 시간 확보)
  await page.waitForTimeout(2000);

  // 클릭 후 에러 상태 확인
  console.log('5️⃣ Errors after click:', errors.length);

  const urlAfter = page.url();
  console.log(`URL before: ${urlBefore}`);
  console.log(`URL after: ${urlAfter}`);

  // 에러 목록 출력
  if (errors.length > 0) {
    console.log('\n❌ ERRORS DETECTED:');
    errors.forEach(err => console.log(err));
  }

  // 콘솔 메시지 중 에러 관련 필터링
  const errorMessages = consoleMessages.filter(msg =>
    msg.includes('error') || msg.includes('Error') || msg.includes('failed')
  );

  if (errorMessages.length > 0) {
    console.log('\n⚠️ ERROR-RELATED CONSOLE MESSAGES:');
    errorMessages.forEach(msg => console.log(msg));
  }

  // JavaScript 실행 가능 여부 확인
  const isJsWorking = await page.evaluate(() => {
    try {
      console.log('JS execution test');
      return true;
    } catch (e) {
      return false;
    }
  });

  console.log(`\n✅ JavaScript still working: ${isJsWorking}`);

  // 클릭 핸들러 존재 여부 확인
  const hasClickHandler = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div')).filter(
      el => el.textContent?.includes('Sales Hub')
    );

    return cards.map(card => {
      const hasHandler = !!(card as any).onclick;
      const reactKey = Object.keys(card).find(k => k.startsWith('__react'));
      return {
        hasOnClick: hasHandler,
        hasReactProps: !!reactKey,
      };
    });
  });

  console.log('\nClick handlers:', JSON.stringify(hasClickHandler, null, 2));

  console.log('\n=== Debug Complete ===');
});
