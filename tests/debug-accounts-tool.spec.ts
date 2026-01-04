import { test, expect } from '@playwright/test';

test('카드 선택 화면에서 Accounts 툴 연결 확인', async ({ page }) => {
  // 네트워크 및 콘솔 모니터링
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('❌ Console Error:', msg.text());
  });

  // 1. Hubs 페이지 접속
  console.log('📍 Step 1: Hubs 페이지 접속');
  await page.goto('http://localhost:3090/hubs');
  await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/01-hubs-page.png', fullPage: true });

  // 2. Tools 버튼 찾기 및 클릭
  console.log('📍 Step 2: Tools 버튼 찾기');
  const toolsButton = page.locator('button:has-text("Tools")');
  await expect(toolsButton).toBeVisible();
  await toolsButton.click();
  await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/02-tools-menu-open.png', fullPage: true });

  // 3. Accounts 메뉴 항목 찾기
  console.log('📍 Step 3: Accounts 메뉴 항목 확인');
  const accountsMenuItem = page.locator('button:has-text("Accounts")').filter({ hasNotText: 'Bot' });
  await expect(accountsMenuItem).toBeVisible();

  // 버튼이 비활성화되지 않았는지 확인
  const isDisabled = await accountsMenuItem.isDisabled();
  console.log(`Accounts 버튼 활성화 상태: ${!isDisabled}`);

  if (isDisabled) {
    console.log('❌ Accounts 버튼이 비활성화되어 있습니다!');
    await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/03-accounts-disabled.png', fullPage: true });
    throw new Error('Accounts 버튼이 비활성화되어 있습니다');
  }

  // 4. Accounts 버튼 클릭
  console.log('📍 Step 4: Accounts 버튼 클릭');
  await accountsMenuItem.click();

  // 5. /admin/accounts 페이지로 이동했는지 확인
  console.log('📍 Step 5: 계정 관리 페이지 이동 확인');
  await page.waitForURL('**/admin/accounts', { timeout: 5000 });
  const currentUrl = page.url();
  console.log(`✅ 현재 URL: ${currentUrl}`);

  expect(currentUrl).toContain('/admin/accounts');

  await page.screenshot({ path: '/home/peterchung/HWTestAgent/test-results/04-accounts-page.png', fullPage: true });

  console.log('✅ 테스트 성공: Tools > Accounts 연결이 정상 작동합니다');
});
