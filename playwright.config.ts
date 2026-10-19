import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for BunnyCure
 * Follows battle-tested patterns from playwright-skill
 */
export default defineConfig({
  testDir: './e2e',
  testIgnore: process.env.CI
    ? ['**/*audit.spec.ts', '**/visual-regression.spec.ts']
    : ['**/*audit.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Runners de GitHub tienen 4 vCPU; 2 workers acortan la suite sin saturar el servidor de desarrollo
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    serviceWorkers: 'block',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
