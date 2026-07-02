import { test, expect } from '@playwright/test';

test.describe('E2E Cart and Checkout Flow', () => {
  test('should support adding product to cart and going to checkout', async ({ page }) => {
    // Go to home page
    await page.goto('/');

    // Click on the first product card
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();

    // Select size M if available
    const sizeButton = page.locator('button:has-text("M")').first();
    if (await sizeButton.isVisible()) {
      await sizeButton.click();
    }

    // Add to cart
    await page.click('button:has-text("Add to Cart")');

    // Drawer should open automatically or we open it
    const drawer = page.locator('[data-testid="cart-drawer"]');
    // If drawer is open, check count
    const cartCount = page.locator('[data-testid="cart-count"]').first();
    await expect(cartCount).toContainText('1');

    // Increase quantity in cart
    await page.click('[data-testid="quantity-increase"]');
    await expect(cartCount).toContainText('2');

    // Go to checkout page
    await page.click('text=Proceed to Checkout');
    await expect(page).toHaveURL(/\/checkout/);

    // Verify checkout page fields are visible
    await expect(page.locator('input[name="customer_name"]')).toBeVisible();
    await expect(page.locator('input[name="address_line1"]')).toBeVisible();
  });
});
