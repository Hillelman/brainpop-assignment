import { test as base, expect } from '@playwright/test'
import { ItemDetailPage } from './pages/ItemDetailPage.ts'
import { QueuePage } from './pages/QueuePage.ts'
import { SubmitPage } from './pages/SubmitPage.ts'

interface Fixtures {
  queuePage: QueuePage
  submitPage: SubmitPage
  detailPage: ItemDetailPage
}

export const test = base.extend<Fixtures>({
  queuePage: async ({ page }, use) => use(new QueuePage(page)),
  submitPage: async ({ page }, use) => use(new SubmitPage(page)),
  detailPage: async ({ page }, use) => use(new ItemDetailPage(page)),
})

export { expect }

export function uniqueTitle(label: string): string {
  return `${label} ${Date.now()}${Math.floor(Math.random() * 1000)}`
}

export function uniqueName(label: string): string {
  return `${label} ${Date.now()}${Math.floor(Math.random() * 1000)}`
}
