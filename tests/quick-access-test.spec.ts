import { test, expect } from '@playwright/test';

test('HubManager 접속 테스트', async ({ page }) => {
  console.log('Testing HubManager at http://localhost:3090');
  
  const response = await page.goto('http://localhost:3090', { 
    waitUntil: 'domcontentloaded',
    timeout: 10000 
  });
  
  console.log('Response status:', response?.status());
  console.log('Current URL:', page.url());
  
  await page.screenshot({ path: '/tmp/hubmanager-screenshot.png', fullPage: true });
  
  expect(response?.status()).toBe(200);
});

test('FinHub 접속 테스트', async ({ page }) => {
  console.log('Testing FinHub at http://localhost:3020');
  
  const response = await page.goto('http://localhost:3020', { 
    waitUntil: 'domcontentloaded',
    timeout: 10000 
  });
  
  console.log('Response status:', response?.status());
  console.log('Current URL:', page.url());
  
  await page.screenshot({ path: '/tmp/finhub-screenshot.png', fullPage: true });
  
  expect(response?.status()).toBe(200);
});
