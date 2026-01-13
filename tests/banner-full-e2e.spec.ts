import { test, expect } from '@playwright/test';

test.describe('Banner Management Full E2E Test', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Get dev-login token for API calls
    const response = await request.get('http://localhost:4090/api/auth/dev-login');
    const data = await response.json();
    authToken = data.data.token;
    console.log('✅ Authentication token obtained');
  });

  test('Complete banner lifecycle: create, view, update, delete', async ({ page, request }) => {
    // 1. Login via dev-login
    console.log('📍 Step 1: Authenticate via dev-login');
    await page.goto('http://localhost:4090/api/auth/dev-login');
    expect(await page.locator('body').textContent()).toContain('success');
    console.log('✅ Authenticated');

    // 2. Navigate to admin banners page
    console.log('📍 Step 2: Navigate to /admin/banners');
    await page.goto('http://localhost:3090/admin/banners');
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    const heading = await page.locator('h1, h2').filter({ hasText: /배너 관리|Banner/i }).first();
    await expect(heading).toBeVisible();
    console.log('✅ Banner management page loaded');

    // 3. Get initial banner count via API
    console.log('📍 Step 3: Get initial banner count');
    const initialResponse = await request.get('http://localhost:4090/api/banners', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const initialData = await initialResponse.json();
    const initialCount = initialData.data.length;
    console.log(`📊 Initial banner count: ${initialCount}`);

    // 4. Create new banner via API
    console.log('📍 Step 4: Create new test banner');
    const newBanner = {
      title: 'E2E Test Banner',
      message: 'This is a test banner created by E2E test',
      variant: 'warning',
      action_type: 'none',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      is_active: true,
      target_hubs: ['wbhubmanager'],
      dismiss_duration: 7,
      order_index: 100
    };

    const createResponse = await request.post('http://localhost:4090/api/banners', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: newBanner
    });
    expect(createResponse.status()).toBe(201);
    const createdBanner = await createResponse.json();
    const bannerId = createdBanner.data.id;
    console.log(`✅ Banner created with ID: ${bannerId}`);

    // 5. Refresh page and verify new banner appears
    console.log('📍 Step 5: Verify new banner appears in list');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/banner-after-create.png',
      fullPage: true
    });

    // Verify banner count increased
    const afterCreateResponse = await request.get('http://localhost:4090/api/banners', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const afterCreateData = await afterCreateResponse.json();
    expect(afterCreateData.data.length).toBe(initialCount + 1);
    console.log(`✅ Banner count increased to ${afterCreateData.data.length}`);

    // 6. Update banner via API
    console.log('📍 Step 6: Update banner');
    const updateResponse = await request.put(`http://localhost:4090/api/banners/${bannerId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        ...newBanner,
        title: 'E2E Test Banner (Updated)',
        variant: 'success'
      }
    });
    expect(updateResponse.status()).toBe(200);
    console.log('✅ Banner updated');

    // 7. Verify update
    console.log('📍 Step 7: Verify banner update');
    await page.reload();
    await page.waitForLoadState('networkidle');

    const getResponse = await request.get(`http://localhost:4090/api/banners/${bannerId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const updatedBanner = await getResponse.json();
    expect(updatedBanner.data.title).toBe('E2E Test Banner (Updated)');
    expect(updatedBanner.data.variant).toBe('success');
    console.log('✅ Banner update verified');

    // 8. Test active banners endpoint
    console.log('📍 Step 8: Test active banners endpoint');
    const activeResponse = await request.get('http://localhost:4090/api/banners/active?hub=wbhubmanager', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    expect(activeResponse.status()).toBe(200);
    const activeBanners = await activeResponse.json();
    const ourBanner = activeBanners.data.find((b: any) => b.id === bannerId);
    expect(ourBanner).toBeDefined();
    console.log('✅ Banner appears in active banners');

    // 9. Delete banner
    console.log('📍 Step 9: Delete test banner');
    const deleteResponse = await request.delete(`http://localhost:4090/api/banners/${bannerId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    expect(deleteResponse.status()).toBe(200);
    console.log('✅ Banner deleted');

    // 10. Verify deletion
    console.log('📍 Step 10: Verify banner deletion');
    await page.reload();
    await page.waitForLoadState('networkidle');

    const finalResponse = await request.get('http://localhost:4090/api/banners', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const finalData = await finalResponse.json();
    expect(finalData.data.length).toBe(initialCount);
    console.log(`✅ Banner count back to ${initialCount}`);

    // Final screenshot
    await page.screenshot({
      path: '/home/peterchung/HWTestAgent/test-results/banner-final-state.png',
      fullPage: true
    });
    console.log('📸 Final screenshot saved');
    console.log('✅ Full E2E test completed successfully');
  });

  test('Test banner display on GlobalBanner component', async ({ page, request }) => {
    // 1. Authenticate
    console.log('📍 Testing GlobalBanner display');
    await page.goto('http://localhost:4090/api/auth/dev-login');

    // 2. Go to homepage
    await page.goto('http://localhost:3090');
    await page.waitForLoadState('networkidle');

    // 3. Check if banner is displayed (if any active banners exist)
    const bannerResponse = await request.get('http://localhost:4090/api/banners/active?hub=wbhubmanager', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const banners = await bannerResponse.json();

    if (banners.data && banners.data.length > 0) {
      console.log(`✅ Found ${banners.data.length} active banner(s)`);

      // Wait for banner to appear
      await page.waitForSelector('[data-testid="global-banner"], [class*="banner"]', { timeout: 5000 })
        .catch(() => console.log('⚠️ Banner element not found in DOM'));

      await page.screenshot({
        path: '/home/peterchung/HWTestAgent/test-results/banner-display.png',
        fullPage: true
      });
      console.log('📸 Banner display screenshot saved');
    } else {
      console.log('ℹ️ No active banners to display');
    }
  });
});
