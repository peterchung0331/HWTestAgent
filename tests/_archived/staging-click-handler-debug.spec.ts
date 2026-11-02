import { test, expect } from '@playwright/test';

test('Debug click handlers on staging', async ({ page }) => {
  console.log('=== Starting Click Handler Debug ===\n');

  // 모든 클릭 이벤트 캡처
  await page.evaluate(() => {
    // 전역 클릭 리스너 추가
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      console.log('🖱️ CLICK EVENT:', {
        tag: target.tagName,
        class: target.className,
        text: target.textContent?.substring(0, 50),
        hasOnClick: !!(target as any).onclick,
      });
    }, true);
  });

  console.log('1️⃣ Navigating to staging...');
  await page.goto('https://staging.workhub.biz:4400/hubs', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  await page.waitForSelector('text=Sales Hub', { timeout: 10000 });
  console.log('✅ Page loaded\n');

  console.log('2️⃣ Inspecting Sales Hub card structure...');

  const cardInfo = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    const salesHubDiv = allDivs.find(el => el.textContent?.includes('Sales Hub') && el.textContent?.includes('대시보드로 이동'));

    if (!salesHubDiv) {
      return { found: false };
    }

    // 모든 부모 요소 탐색
    const parents = [];
    let current = salesHubDiv;
    let depth = 0;

    while (current && depth < 15) {
      const computed = window.getComputedStyle(current);
      const hasClickListener = !!(current as any).onclick;

      // React 이벤트 확인
      const reactKey = Object.keys(current).find(k => k.startsWith('__react'));
      const reactProps = reactKey ? (current as any)[reactKey] : null;

      parents.push({
        depth,
        tag: current.tagName,
        classes: current.className,
        hasOnClickAttribute: hasClickListener,
        hasReactProps: !!reactProps,
        pointerEvents: computed.pointerEvents,
        cursor: computed.cursor,
        zIndex: computed.zIndex,
        position: computed.position,
        display: computed.display,
      });

      current = current.parentElement as HTMLElement;
      depth++;
    }

    return {
      found: true,
      structure: parents,
    };
  });

  console.log('Card structure:', JSON.stringify(cardInfo, null, 2));

  console.log('\n3️⃣ Testing different click strategies...');

  // 전략 1: "대시보드로 이동" 버튼 텍스트 클릭
  console.log('\n📍 Strategy 1: Click button text');
  try {
    const button = page.locator('text=대시보드로 이동').first();
    const isVisible = await button.isVisible();
    console.log(`  - Button visible: ${isVisible}`);

    if (isVisible) {
      await button.click({ timeout: 3000 });
      console.log('  ✅ Click executed');
      await page.waitForTimeout(500);
      console.log(`  - URL after click: ${page.url()}`);
    }
  } catch (e) {
    console.log(`  ❌ Failed: ${e}`);
  }

  // 전략 2: 카드 전체 클릭 (상위 div)
  console.log('\n📍 Strategy 2: Click card container');
  await page.goto('https://staging.workhub.biz:4400/hubs');
  await page.waitForSelector('text=Sales Hub');

  try {
    const card = page.locator('div').filter({ hasText: 'Sales Hub' }).filter({ hasText: '대시보드로 이동' }).first();
    await card.click({ position: { x: 100, y: 100 }, timeout: 3000 });
    console.log('  ✅ Click executed');
    await page.waitForTimeout(500);
    console.log(`  - URL after click: ${page.url()}`);
  } catch (e) {
    console.log(`  ❌ Failed: ${e}`);
  }

  // 전략 3: JavaScript 직접 클릭
  console.log('\n📍 Strategy 3: JavaScript click');
  await page.goto('https://staging.workhub.biz:4400/hubs');
  await page.waitForSelector('text=Sales Hub');

  try {
    await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const salesHubDiv = allDivs.find(el =>
        el.textContent?.includes('Sales Hub') &&
        el.textContent?.includes('대시보드로 이동')
      );

      if (salesHubDiv) {
        console.log('Found card, triggering click...');
        (salesHubDiv as HTMLElement).click();
      } else {
        console.log('Card not found');
      }
    });
    console.log('  ✅ JavaScript click executed');
    await page.waitForTimeout(500);
    console.log(`  - URL after JS click: ${page.url()}`);
  } catch (e) {
    console.log(`  ❌ Failed: ${e}`);
  }

  // 전략 4: 마우스 이동 후 클릭
  console.log('\n📍 Strategy 4: Hover then click');
  await page.goto('https://staging.workhub.biz:4400/hubs');
  await page.waitForSelector('text=Sales Hub');

  try {
    const button = page.locator('text=대시보드로 이동').first();
    await button.hover();
    console.log('  - Hovered over button');
    await page.waitForTimeout(300);
    await button.click({ timeout: 3000 });
    console.log('  ✅ Click after hover executed');
    await page.waitForTimeout(500);
    console.log(`  - URL after hover+click: ${page.url()}`);
  } catch (e) {
    console.log(`  ❌ Failed: ${e}`);
  }

  console.log('\n=== Debug Complete ===');
});
