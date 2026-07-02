import { test, expect } from '@playwright/test';

test.describe('E2E Admin Product CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // E2E test requires admin session - we bypass by adding a mock token or performing login
    // Let's go to admin login page first if we need to log in
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'adminpassword');
    // If auth is mocked or we can access the dashboard directly:
    await page.goto('/admin/products');
  });

  test('should display product list and allow filter by search', async ({ page }) => {
    // Search input should filter items
    await page.fill('input[placeholder*="Search"]', 'T-Shirt');
    await page.press('input[placeholder*="Search"]', 'Enter');
    
    // Check that results contain searched term
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows.first()).toContainText(/T-Shirt/i);
  });

  test('should display validation warnings on empty product form submission', async ({ page }) => {
    // Click "Add Product"
    await page.click('text=Add Product');

    // Attempt to submit empty form
    await page.click('button[type="submit"]');

    // Assert validation errors for required fields
    const titleError = page.locator('text=Title is required');
    await expect(titleError).toBeVisible();
  });
});
