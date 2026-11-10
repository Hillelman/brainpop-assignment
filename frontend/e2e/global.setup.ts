import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { clerk, clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'
import { authFile, backendDir, clerkEnvMissing, e2eDataDir } from './support/env.ts'

setup('seed isolated data', () => {
  rmSync(e2eDataDir, { recursive: true, force: true })
  mkdirSync(e2eDataDir, { recursive: true })
  execFileSync('php', ['artisan', 'app:seed-json', '--fresh', '--count=30'], {
    cwd: backendDir,
    env: { ...process.env, JSON_STORAGE_PATH: e2eDataDir },
    stdio: 'pipe',
  })
})

setup('sign in with Clerk', async ({ page }) => {
  // The first page load compiles the whole app on the Vite dev server, which can be slow.
  setup.setTimeout(120_000)
  mkdirSync(dirname(authFile), { recursive: true })
  const missing = clerkEnvMissing()
  if (missing.length > 0) {
    writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }))
    setup.skip(true, `Clerk env vars missing: ${missing.join(', ')}`)
    return
  }

  await clerkSetup()
  await page.goto('/')
  // Signs in through a Clerk sign-in token created with CLERK_SECRET_KEY for the test user's email,
  // so it does not depend on the password or on password sign-in being enabled.
  const emailAddress = process.env.E2E_CLERK_USER_USERNAME
  if (!emailAddress) throw new Error('E2E_CLERK_USER_USERNAME is not set')
  await clerk.signIn({ page, emailAddress })
  await page.goto('/items')
  await page.getByRole('heading', { name: 'Review Queue' }).waitFor()
  await page.context().storageState({ path: authFile })
})
