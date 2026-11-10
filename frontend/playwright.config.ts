import { defineConfig, devices } from '@playwright/test'
import {
  authFile,
  backendPort,
  backendUrl,
  e2eDataDir,
  frontendPort,
  frontendUrl,
  loadFrontendEnv,
  resolveClerkEnv,
} from './e2e/support/env.ts'

loadFrontendEnv()
resolveClerkEnv()

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'chromium',
      testMatch: /specs\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: authFile },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: `php artisan serve --port=${backendPort}`,
      cwd: '../backend',
      url: `${backendUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        JSON_STORAGE_PATH: e2eDataDir,
        CORS_ALLOWED_ORIGINS: frontendUrl,
        CLERK_AUTHORIZED_PARTIES: frontendUrl,
        CACHE_STORE: 'file',
      },
    },
    {
      command: `pnpm dev --port ${frontendPort}`,
      url: frontendUrl,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_API_BASE_URL: `${backendUrl}/api` },
    },
  ],
})
