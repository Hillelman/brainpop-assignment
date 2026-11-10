import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures.ts'
import { QueuePage } from '../pages/QueuePage.ts'

async function boxes(page: Page) {
  await page.goto('/items')
  const firstFilter = page.locator('[data-test="filter-control"]').first()
  await expect(firstFilter).toBeVisible()
  const search = page.getByRole('searchbox', { name: 'Search items' })
  const toolbar = page.locator('[data-test="queue-toolbar"]')
  const [filterBox, searchBox, toolbarBox] = await Promise.all([
    firstFilter.boundingBox(),
    search.boundingBox(),
    toolbar.boundingBox(),
  ])
  if (!filterBox || !searchBox || !toolbarBox) throw new Error('toolbar elements not laid out')
  return { filterBox, searchBox, toolbarBox }
}

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
]) {
  test(`search shares the filter row at the end at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    const { filterBox, searchBox, toolbarBox } = await boxes(page)
    expect(Math.abs(searchBox.y - filterBox.y)).toBeLessThanOrEqual(4)
    const searchRight = searchBox.x + searchBox.width
    const toolbarRight = toolbarBox.x + toolbarBox.width
    expect(Math.abs(searchRight - toolbarRight)).toBeLessThanOrEqual(4)
  })
}

test('search sits below the filters on a phone without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const { filterBox, searchBox } = await boxes(page)
  expect(searchBox.y).toBeGreaterThan(filterBox.y + filterBox.height)
  const noOverflow = await page.evaluate(
    'document.documentElement.scrollWidth <= window.innerWidth',
  )
  expect(noOverflow).toBe(true)
})

test('header Clear filters sits on the title row at the far right and clears the filter', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  const queue = new QueuePage(page)
  await queue.goto()
  const button = page.locator('[data-test="header-clear-filters"]')
  await expect(button).toHaveCount(0)
  await queue.chooseFilter('Status', 'Approved')
  await expect(page).toHaveURL(/filter%5Bstatus%5D=approved|filter\[status\]=approved/)
  await expect(button).toBeVisible()
  const [h1Box, buttonBox, mainBox] = await Promise.all([
    page.getByRole('heading', { name: 'Review Queue' }).boundingBox(),
    button.boundingBox(),
    page.locator('[data-test="queue-toolbar"]').boundingBox(),
  ])
  if (!h1Box || !buttonBox || !mainBox) throw new Error('header elements not laid out')
  expect(Math.abs(buttonBox.y - h1Box.y)).toBeLessThanOrEqual(4)
  expect(Math.abs(buttonBox.x + buttonBox.width - (mainBox.x + mainBox.width))).toBeLessThanOrEqual(
    4,
  )
  await button.click()
  await expect(button).toHaveCount(0)
  await expect(page).not.toHaveURL(/filter/)
})
