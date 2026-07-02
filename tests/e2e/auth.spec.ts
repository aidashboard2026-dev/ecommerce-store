import { test, expect } from '@playwright/test';

test.describe('E2E Authentication Flow', () => {
  test('should display validation error on admin login failure', async ({ page }) => {
    // Go to admin login page
    await page.goto('/admin/login');

    // Fill credentials
    await page.fill('input[type="email"]', 'wrong_admin@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Click submit
    await page.click('#admin-login-submit');

    // Verify error banner is visible
    const errorBanner = page.locator('#login-error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Invalid credentials');
  });

  test('should display validation error on customer login failure', async ({ page }) => {
    // Go to customer login page
    await page.goto('/auth/login');

    // Fill credentials
    await page.fill('input[type="email"]', 'wrong_customer@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit form (find button or press Enter)
    await page.click('button[type="submit"]');

    // Verify authentication error message
    const errorMsg = page.locator('text=Invalid credentials');
    await expect(errorMsg).toBeVisible();
  });
});
