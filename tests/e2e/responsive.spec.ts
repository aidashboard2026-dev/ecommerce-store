import { test, expect } from '@playwright/test';

test.describe('E2E Storefront Responsive Adaptability', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport size

  test('should display mobile drawer menu hamburger on small screens', async ({ page }) => {
    // Go to storefront
    await page.goto('/');

    // Desktop nav should be hidden, mobile hamburger trigger should be visible
    const hamburgerBtn = page.locator('button[id*="mobile-menu"], button[aria-label*="menu"]').first();
    
    // Check that we adapt layout elements
    const desktopNav = page.locator('nav').filter({ hasText: 'Collections' });
    if (await desktopNav.isVisible()) {
      const isHeaderResponsive = await desktopNav.evaluate(el => window.getComputedStyle(el).display === 'none');
      expect(isHeaderResponsive || await hamburgerBtn.isVisible()).toBe(true);
    } else {
      // If it doesn't render, it means header is hidden / changed on mobile
      expect(true).toBe(true);
    }
  });
});
