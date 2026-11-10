import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures.ts'
import { QueuePage } from '../pages/QueuePage.ts'

async function box(locator: ReturnType<Page['locator']>) {
  const b = await locator.boundingBox()
  if (!b) throw new Error('element not laid out')
  return b
}

test('Status, Risk and Submitter share a line and the date rows sit below, aligned', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await new QueuePage(page).goto()
  const status = await box(page.getByRole('combobox', { name: 'Status' }))
  const risk = await box(page.getByRole('combobox', { name: 'Risk' }))
  const submitter = await box(page.getByRole('combobox', { name: 'Submitter' }))
  expect(Math.abs(risk.y - status.y)).toBeLessThanOrEqual(2)
  expect(Math.abs(submitter.y - status.y)).toBeLessThanOrEqual(2)

  const created = page.getByRole('group', { name: 'Created at' })
  const reviewed = page.getByRole('group', { name: 'Reviewed at' })
  const createdBox = await box(created)
  const reviewedBox = await box(reviewed)
  expect(createdBox.y).toBeGreaterThanOrEqual(status.y + status.height)
  expect(reviewedBox.y).toBeGreaterThanOrEqual(createdBox.y + createdBox.height)

  const createdFrom = await box(page.getByLabel('Created at from'))
  const reviewedFrom = await box(page.getByLabel('Reviewed at from'))
  expect(Math.abs(createdFrom.x - reviewedFrom.x)).toBeLessThanOrEqual(2)

  for (const [group, from] of [
    [created, createdFrom],
    [reviewed, reviewedFrom],
  ] as const) {
    const label = await box(group.locator('[data-test="filter-group-label"]'))
    expect(label.x + label.width).toBeLessThanOrEqual(from.x)
  }
})

test('phone: no horizontal scroll and Clear filters stays on the title line', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const queue = new QueuePage(page)
  await queue.goto()
  await queue.chooseFilter('Status', 'Approved')
  const button = page.locator('[data-test="header-clear-filters"]')
  await expect(button).toBeVisible()
  const h1 = await box(page.getByRole('heading', { name: 'Review Queue' }))
  const buttonBox = await box(button)
  expect(Math.abs(buttonBox.y - h1.y)).toBeLessThanOrEqual(4)
  const noOverflow = await page.evaluate(
    'document.documentElement.scrollWidth <= window.innerWidth',
  )
  expect(noOverflow).toBe(true)
})
