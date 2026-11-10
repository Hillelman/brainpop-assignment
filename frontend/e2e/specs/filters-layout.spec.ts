import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures.ts'
import { QueuePage } from '../pages/QueuePage.ts'

async function box(locator: ReturnType<Page['locator']>) {
  const b = await locator.boundingBox()
  if (!b) throw new Error('element not laid out')
  return b
}

test('Status, Risk and Submitter share a line; the date groups share one line behind More filters', async ({
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
  const toggle = page.locator('[data-test="toggle-more-filters"]')
  await expect(created).toHaveCount(0)
  await expect(toggle).toHaveText(/More filters/)

  await toggle.click()
  await expect(toggle).toHaveText(/Less filters/)
  const createdBox = await box(created)
  const reviewedBox = await box(reviewed)
  expect(Math.abs(createdBox.y - reviewedBox.y)).toBeLessThanOrEqual(4)
  expect(reviewedBox.x).toBeGreaterThanOrEqual(createdBox.x + createdBox.width)

  for (const [group, name] of [
    [created, 'Created at from'],
    [reviewed, 'Reviewed at from'],
  ] as const) {
    const label = await box(group.locator('[data-test="filter-group-label"]'))
    const from = await box(page.getByLabel(name))
    expect(label.x + label.width).toBeLessThanOrEqual(from.x)
  }

  await toggle.click()
  await expect(created).toHaveCount(0)
  await expect(reviewed).toHaveCount(0)
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
  const fits = () => page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
  expect(await fits()).toBe(true)
  await page.locator('[data-test="toggle-more-filters"]').click()
  await expect(page.getByRole('group', { name: 'Reviewed at' })).toBeVisible()
  expect(await fits()).toBe(true)
})
