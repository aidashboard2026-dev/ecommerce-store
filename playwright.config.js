import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Dynamically detect base URL from process.env or .env file
function getBaseUrl() {
  if (process.env.PLAYWRIGHT_TEST_BASE_URL) {
    return process.env.PLAYWRIGHT_TEST_BASE_URL;
  }
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^FRONTEND_URL\s*=\s*(.+)$/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (err) {
    // Fallback if file read fails
  }
  return 'http://localhost:5173';
}

const baseURL = getBaseUrl();

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
