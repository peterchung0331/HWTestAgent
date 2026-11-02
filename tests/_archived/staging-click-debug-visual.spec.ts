import { test, expect } from '@playwright/test';

test('Visual debug: Click Hub card on staging', async ({ page }) => {
  console.log('=== Visual Debug Test ===\n');

  // 페이지 로드
  console.log('1️⃣ Loading staging...');
  await page.goto('https://staging.workhub.biz:4400/hubs', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  await page.waitForSelector('text=Sales Hub', { timeout: 10000 });
  console.log('✅ Page loaded\n');

  // 5초 대기 (사용자가 화면을 볼 수 있도록)
  console.log('⏳ Waiting 5 seconds for you to see the page...');
  await page.waitForTimeout(5000);

  // 버튼 요소 정보 출력
  console.log('2️⃣ Inspecting button element...');
  const buttonInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('div')).filter(
      el => el.textContent === '대시보드로 이동'
    );

    return buttons.map(btn => ({
      innerHTML: btn.innerHTML,
      className: btn.className,
      computedStyle: {
        pointerEvents: window.getComputedStyle(btn).pointerEvents,
        cursor: window.getComputedStyle(btn).cursor,
        backgroundColor: window.getComputedStyle(btn).backgroundColor,
      },
      inlineStyle: (btn as HTMLElement).style.cssText,
      parentClassName: btn.parentElement?.className,
    }));
  });

  console.log('Button info:', JSON.stringify(buttonInfo, null, 2));

  // 버튼 하이라이트
  console.log('\n3️⃣ Highlighting button (red border)...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('div')).filter(
      el => el.textContent === '대시보드로 이동'
    );
    buttons.forEach(btn => {
      (btn as HTMLElement).style.border = '3px solid red';
    });
  });

  await page.waitForTimeout(2000);

  // 클릭 전 URL
  const urlBefore = page.url();
  console.log(`\n4️⃣ URL before click: ${urlBefore}`);

  // 버튼 클릭
  console.log('5️⃣ Clicking button...');
  const button = page.locator('text=대시보드로 이동').first();
  await button.click();
  console.log('✅ Click executed');

  // 3초 대기 (리디렉션 확인)
  await page.waitForTimeout(3000);

  // 클릭 후 URL
  const urlAfter = page.url();
  console.log(`\n6️⃣ URL after click: ${urlAfter}`);

  // 검증
  const isRedirected = urlAfter !== urlBefore;
  console.log(`\n✅ Redirected: ${isRedirected}`);

  if (urlAfter.includes('accounts.google.com')) {
    console.log('✅ Redirected to Google OAuth');
  } else if (urlAfter.includes('saleshub')) {
    console.log('✅ Redirected to SalesHub');
  } else {
    console.log(`⚠️ Unexpected URL: ${urlAfter}`);
  }

  expect(isRedirected).toBeTruthy();

  console.log('\n🎉 Test Complete!');
});
