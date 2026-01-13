import { test, expect } from '@playwright/test';

test('Reproduce real browser click issue on staging', async ({ page }) => {
  console.log('=== Starting Real Browser Click Test ===\n');

  // 모든 네트워크 요청 로깅
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log(`📤 Request: ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`📥 Response: ${response.status()} ${response.url()}`);
    }
  });

  // 콘솔 에러 로깅
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });

  // JavaScript 에러 캐치
  page.on('pageerror', error => {
    console.log(`❌ JavaScript Error: ${error.message}`);
  });

  console.log('1️⃣ Navigating to staging...');
  await page.goto('https://staging.workhub.biz:4400/hubs', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // 페이지 로드 확인
  await page.waitForSelector('text=Sales Hub', { timeout: 10000 });
  console.log('✅ Page loaded\n');

  // 스크린샷 1: 초기 상태
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/real-browser-initial.png',
    fullPage: true
  });

  console.log('2️⃣ Checking event handlers...');

  // 카드 클릭 이벤트 핸들러 확인
  const hasClickHandler = await page.evaluate(() => {
    // Sales Hub 텍스트를 포함하는 요소 찾기
    const allElements = Array.from(document.querySelectorAll('*'));
    const salesHubElement = allElements.find(el => el.textContent?.includes('Sales Hub'));
    const cardElement = salesHubElement?.closest('[class*="relative"]') || salesHubElement?.closest('div.relative.overflow-hidden');

    if (!cardElement) return { found: false };

    // React 이벤트 핸들러 확인
    const reactProps = Object.keys(cardElement).find(key => key.startsWith('__reactProps'));
    const hasOnClick = reactProps && (cardElement as any)[reactProps]?.onClick;

    return {
      found: true,
      hasReactOnClick: !!hasOnClick,
      elementTag: cardElement.tagName,
      elementClass: cardElement.className,
    };
  });

  console.log('Event handlers:', JSON.stringify(hasClickHandler, null, 2));

  console.log('\n3️⃣ Testing Sales Hub card click...');
  const salesHubButton = page.locator('text=대시보드로 이동').first();

  // 클릭 전 페이지 상태 저장
  const urlBefore = page.url();
  console.log(`URL before click: ${urlBefore}`);

  // CSS 스타일 확인
  const cardStyles = await salesHubButton.evaluate((el) => {
    const card = el.closest('[class*="relative"]');
    if (!card) return null;

    const computed = window.getComputedStyle(card);
    return {
      pointerEvents: computed.pointerEvents,
      cursor: computed.cursor,
      zIndex: computed.zIndex,
      position: computed.position,
      display: computed.display,
    };
  });

  console.log('Card styles:', JSON.stringify(cardStyles, null, 2));

  // 실제 클릭 시도
  console.log('\n4️⃣ Attempting click (normal)...');
  try {
    await salesHubButton.click({ timeout: 5000 });
    console.log('✅ Click command executed');

    // 1초 대기
    await page.waitForTimeout(1000);

    const urlAfter = page.url();
    console.log(`URL after click: ${urlAfter}`);

    if (urlAfter !== urlBefore) {
      console.log('✅ Navigation occurred!');
    } else {
      console.log('❌ No navigation - click may have failed');
    }

    // 스크린샷 2: 클릭 후
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/real-browser-after-click.png',
      fullPage: true
    });
  } catch (error) {
    console.log(`❌ Click failed: ${error}`);
  }

  // force 옵션으로 재시도
  console.log('\n5️⃣ Attempting click (force)...');
  await page.goto('https://staging.workhub.biz:4400/hubs');
  await page.waitForSelector('text=Sales Hub');

  try {
    await salesHubButton.click({ force: true, timeout: 5000 });
    console.log('✅ Force click executed');

    await page.waitForTimeout(1000);
    const urlAfterForce = page.url();
    console.log(`URL after force click: ${urlAfterForce}`);

    if (urlAfterForce !== 'https://staging.workhub.biz:4400/hubs') {
      console.log('✅ Force click caused navigation!');
    } else {
      console.log('❌ Force click did not cause navigation');
    }
  } catch (error) {
    console.log(`❌ Force click failed: ${error}`);
  }

  console.log('\n=== Test Complete ===');
});
