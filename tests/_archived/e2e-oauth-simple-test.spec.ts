import { test, expect } from '@playwright/test';

/**
 * 간단한 OAuth 플로우 테스트
 * 실제 로그인 페이지에서 Google 버튼이 어떻게 작동하는지 확인
 */

test('OAuth 플로우 확인', async ({ page }) => {
  console.log('📌 HubManager 메인 페이지 접속');

  // HubManager 접속
  await page.goto('http://158.180.95.246:4400', { waitUntil: 'networkidle' });

  // 스크린샷 저장
  await page.screenshot({ path: '/tmp/01-homepage.png', fullPage: true });

  // 페이지 HTML 일부 로깅
  const bodyText = await page.locator('body').textContent();
  console.log('📄 Page Content (first 500 chars):', bodyText?.substring(0, 500));

  // Google 로그인 버튼 찾기
  const googleSelectors = [
    'a[href*="google"]',
    'button:has-text("Google")',
    'button:has-text("구글")',
    '[onclick*="google"]'
  ];

  for (const selector of googleSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`✅ Found ${count} elements matching: ${selector}`);
      const element = page.locator(selector).first();
      const href = await element.getAttribute('href');
      const onclick = await element.getAttribute('onclick');
      const text = await element.textContent();
      console.log(`   Text: ${text}`);
      console.log(`   Href: ${href}`);
      console.log(`   Onclick: ${onclick}`);
    }
  }

  // 모든 버튼 확인
  const buttons = await page.locator('button').all();
  console.log(`🔘 Found ${buttons.length} buttons`);
  for (const button of buttons.slice(0, 10)) {
    const text = await button.textContent();
    console.log(`   Button: ${text}`);
  }

  // 모든 링크 확인
  const links = await page.locator('a').all();
  console.log(`🔗 Found ${links.length} links`);
  for (const link of links.slice(0, 10)) {
    const text = await link.textContent();
    const href = await link.getAttribute('href');
    console.log(`   Link: ${text} -> ${href}`);
  }
});
