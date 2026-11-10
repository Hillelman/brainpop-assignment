import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test as base, expect } from '@playwright/test'
import { ItemDetailPage } from './pages/ItemDetailPage.ts'
import { QueuePage } from './pages/QueuePage.ts'
import { SubmitPage } from './pages/SubmitPage.ts'
import { clerkEnvMissing } from './support/env.ts'

interface Fixtures {
  clerkReady: void
  queuePage: QueuePage
  submitPage: SubmitPage
  detailPage: ItemDetailPage
}

export const test = base.extend<Fixtures>({
  clerkReady: [
    async ({ page }, use, testInfo) => {
      const missing = clerkEnvMissing()
      testInfo.skip(
        missing.length > 0,
        `Clerk-dependent spec skipped, env vars missing: ${missing.join(', ')}`,
      )
      await setupClerkTestingToken({ page })
      await use()
    },
    { auto: true },
  ],
  queuePage: async ({ page }, use) => use(new QueuePage(page)),
  submitPage: async ({ page }, use) => use(new SubmitPage(page)),
  detailPage: async ({ page }, use) => use(new ItemDetailPage(page)),
})

export { expect }

export function uniqueTitle(label: string): string {
  return `${label} ${Date.now()}${Math.floor(Math.random() * 1000)}`
}
