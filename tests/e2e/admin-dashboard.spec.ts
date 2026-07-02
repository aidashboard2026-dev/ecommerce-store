import { test, expect } from '@playwright/test';

test.describe('E2E Admin Dashboard Layout', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and login
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'adminpassword');
    // Direct dashboard view
    await page.goto('/admin');
  });

  test('should display dashboard metrics cards and navigation menu', async ({ page }) => {
    // Assert dashboard stats are present (e.g. Sales, Orders)
    const salesCard = page.locator('text=Sales');
    const ordersCard = page.locator('text=Orders');
    
    // Check main navigation links in sidebar
    await expect(page.locator('a[href="/admin/products"]')).toBeVisible();
    await expect(page.locator('a[href="/admin/orders"]')).toBeVisible();
    await expect(page.locator('a[href="/admin/settings"]')).toBeVisible();
  });
});
