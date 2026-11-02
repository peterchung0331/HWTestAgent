import { test, expect } from '@playwright/test';

test('Detailed card click investigation', async ({ page }) => {
  // 모든 이벤트 로깅
  const events: string[] = [];

  page.on('console', msg => {
    events.push(`[${msg.type()}] ${msg.text()}`);
  });

  console.log('=== Navigating to staging ===');
  await page.goto('https://staging.workhub.biz:4400/hubs', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // 페이지 로드 대기
  await page.waitForSelector('text=Sales Hub', { timeout: 10000 });
  console.log('✅ Page loaded');

  // 스크린샷 1
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/detailed-before-click.png',
    fullPage: true
  });

  console.log('\n=== Testing Sales Hub Card ===');

  // 카드의 여러 요소 찾기
  const salesHubText = page.locator('text=Sales Hub').first();
  const button = page.locator('text=대시보드로 이동').first();

  // 카드 컨테이너 찾기 (RippleEffect div)
  const cardContainer = page.locator('div.relative.overflow-hidden').first();

  console.log('Elements found:');
  console.log(`- Sales Hub text visible: ${await salesHubText.isVisible()}`);
  console.log(`- Button visible: ${await button.isVisible()}`);
  console.log(`- Card container visible: ${await cardContainer.isVisible()}`);

  // 각 요소의 bounding box 확인
  const textBox = await salesHubText.boundingBox();
  const buttonBox = await button.boundingBox();
  const containerBox = await cardContainer.boundingBox();

  console.log(`\nBounding boxes:`);
  console.log(`- Text: ${JSON.stringify(textBox)}`);
  console.log(`- Button: ${JSON.stringify(buttonBox)}`);
  console.log(`- Container: ${JSON.stringify(containerBox)}`);

  // 클릭 가능 여부 확인
  console.log(`\nClickability:`);
  console.log(`- Button enabled: ${await button.isEnabled()}`);
  console.log(`- Container enabled: ${await cardContainer.isEnabled()}`);

  // pointer-events CSS 확인
  const buttonStyles = await button.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      pointerEvents: computed.pointerEvents,
      cursor: computed.cursor,
      zIndex: computed.zIndex,
      position: computed.position,
      opacity: computed.opacity,
    };
  });

  console.log(`\nButton CSS:`, buttonStyles);

  const containerStyles = await cardContainer.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      pointerEvents: computed.pointerEvents,
      cursor: computed.cursor,
      zIndex: computed.zIndex,
      position: computed.position,
      opacity: computed.opacity,
    };
  });

  console.log(`Container CSS:`, containerStyles);

  // 부모 요소들의 pointer-events 확인
  const parentPointerEvents = await button.evaluate((el) => {
    const parents: Array<{tag: string, pointerEvents: string, zIndex: string}> = [];
    let current = el.parentElement;
    let depth = 0;

    while (current && depth < 10) {
      const computed = window.getComputedStyle(current);
      parents.push({
        tag: current.tagName,
        pointerEvents: computed.pointerEvents,
        zIndex: computed.zIndex,
      });
      current = current.parentElement;
      depth++;
    }

    return parents;
  });

  console.log(`\nParent elements pointer-events:`, JSON.stringify(parentPointerEvents, null, 2));

  // 실제 클릭 시도
  console.log('\n=== Attempting click ===');
  try {
    await button.click({ timeout: 5000 });
    console.log('✅ Click succeeded');

    await page.waitForTimeout(1000);
    const newUrl = page.url();
    console.log(`New URL: ${newUrl}`);

    // 스크린샷 2
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/detailed-after-click.png',
      fullPage: true
    });
  } catch (error) {
    console.log(`❌ Click failed: ${error}`);
  }

  // 모든 콘솔 로그 출력
  console.log('\n=== Console Events ===');
  events.forEach(e => console.log(e));
});
