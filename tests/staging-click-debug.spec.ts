import { test, expect } from '@playwright/test';

test('Debug click issue on staging', async ({ page }) => {
  // 모든 이벤트 로깅
  const events: string[] = [];

  page.on('console', msg => {
    events.push(`[Console ${msg.type()}] ${msg.text()}`);
  });

  await page.goto('https://staging.workhub.biz:4400/hubs', {
    waitUntil: 'networkidle',
  });

  // 페이지 로드 대기
  await page.waitForSelector('text=Sales Hub');

  // 스크린샷 1
  await page.screenshot({
    path: '/home/peterchung/HWTestAgent/test-results/debug-initial.png',
    fullPage: true
  });

  console.log('=== Testing Sales Hub Card ===');

  // Sales Hub 카드의 모든 요소 확인
  const salesCard = page.locator('text=Sales Hub').locator('xpath=ancestor::div[contains(@class, "relative")]').first();

  // 카드가 visible한지 확인
  const isVisible = await salesCard.isVisible();
  console.log(`Sales card visible: ${isVisible}`);

  // 카드의 bounding box 확인
  const box = await salesCard.boundingBox();
  console.log(`Sales card box:`, box);

  // 클릭 가능한지 확인
  const isEnabled = await salesCard.isEnabled();
  console.log(`Sales card enabled: ${isEnabled}`);

  // 버튼 텍스트 찾기
  const buttonLocator = page.locator('text=대시보드로 이동').first();
  const buttonVisible = await buttonLocator.isVisible();
  console.log(`Button visible: ${buttonVisible}`);

  if (buttonVisible) {
    const buttonBox = await buttonLocator.boundingBox();
    console.log(`Button box:`, buttonBox);
  }

  // 실제 클릭 시도 (force 옵션 사용)
  console.log('Attempting to click with force option...');
  try {
    await buttonLocator.click({ force: true, timeout: 5000 });
    console.log('✅ Click with force succeeded');

    // 1초 대기
    await page.waitForTimeout(1000);

    // URL 변경 확인
    const newUrl = page.url();
    console.log(`New URL: ${newUrl}`);

    // 스크린샷 2
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/debug-after-click.png',
      fullPage: true
    });
  } catch (error) {
    console.log('❌ Click failed:', error);
  }

  // 일반 클릭도 시도
  console.log('Attempting normal click...');
  await page.goto('https://staging.workhub.biz:4400/hubs');
  await page.waitForSelector('text=Sales Hub');

  try {
    await buttonLocator.click({ timeout: 5000 });
    console.log('✅ Normal click succeeded');
  } catch (error) {
    console.log('❌ Normal click failed:', error);
  }

  // DocsHub 버튼도 테스트
  console.log('\n=== Testing Hub Docs Card ===');
  await page.goto('https://staging.workhub.biz:4400/hubs');
  await page.waitForSelector('text=Hub Docs');

  const docsButton = page.locator('text=문서 보기').first();
  const docsButtonVisible = await docsButton.isVisible();
  console.log(`Docs button visible: ${docsButtonVisible}`);

  if (docsButtonVisible) {
    try {
      await docsButton.click({ force: true, timeout: 5000 });
      console.log('✅ Docs button click succeeded');

      await page.waitForTimeout(1000);
      const docsUrl = page.url();
      console.log(`Docs URL: ${docsUrl}`);
    } catch (error) {
      console.log('❌ Docs button click failed:', error);
    }
  }

  // 모든 이벤트 출력
  console.log('\n=== All Events ===');
  events.forEach(e => console.log(e));
});
