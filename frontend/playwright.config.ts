import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const frontendPort = process.env.E2E_FRONTEND_PORT ?? '5199'
const backendPort = process.env.E2E_BACKEND_PORT ?? '8099'
const frontendUrl = `http://localhost:${frontendPort}`
const backendUrl = `http://localhost:${backendPort}`
const e2eDataDir = join(tmpdir(), 'review-queue-e2e-data')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `php artisan serve --port=${backendPort}`,
      cwd: '../backend',
      url: `${backendUrl}/api/health`,
      reuseExistingServer: false,
      env: { JSON_STORAGE_PATH: e2eDataDir, CORS_ALLOWED_ORIGINS: frontendUrl },
    },
    {
      command: `pnpm dev --port ${frontendPort}`,
      url: frontendUrl,
      reuseExistingServer: false,
      env: { VITE_API_BASE_URL: `${backendUrl}/api` },
    },
  ],
})
