import { test, expect } from '@playwright/test';

test.describe('E2E Checkout Payment Flow', () => {
  test('should support selecting different payment methods during checkout', async ({ page }) => {
    // Go directly to checkout (simulating active cart items in localStorage)
    await page.goto('/checkout');

    // Fill in required delivery fields
    await page.fill('input[name="customer_name"]', 'John Buyer');
    await page.fill('input[name="customer_phone"]', '9876543210');
    await page.fill('input[name="address_line1"]', '123 Main St');
    await page.fill('input[name="city"]', 'Mumbai');
    await page.fill('input[name="pincode"]', '400001');

    // Default payment should be Cash on Delivery (COD)
    const codRadio = page.locator('input[value="COD"]');
    await expect(codRadio).toBeChecked();

    // Select Card Payment if available
    const cardRadio = page.locator('input[value="CARD"]');
    if (await cardRadio.isVisible()) {
      await cardRadio.click();
      await expect(cardRadio).toBeChecked();
      await expect(codRadio).not.toBeChecked();
    }
  });
});
