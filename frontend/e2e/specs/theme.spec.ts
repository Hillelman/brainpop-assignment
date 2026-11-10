import { expect, test } from '@playwright/test'

test('theme choice persists across reloads', async ({ page }) => {
  await page.goto('/items')
  const html = page.locator('html')
  await expect(html).not.toHaveClass(/dark/)

  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(html).toHaveClass(/dark/)
  await page.reload()
  await expect(html).toHaveClass(/dark/)

  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(html).not.toHaveClass(/dark/)
  await page.reload()
  await expect(html).not.toHaveClass(/dark/)
})

test('toggle stays visible at the right on a 375px phone without wrapping the nav', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/items')
  const toggle = page.getByRole('button', { name: 'Switch to dark theme' })
  await expect(toggle).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Main' })
  const toggleBox = await toggle.boundingBox()
  const navBox = await nav.boundingBox()
  expect(toggleBox).not.toBeNull()
  expect(navBox).not.toBeNull()
  if (!toggleBox || !navBox) return
  expect(toggleBox.x + toggleBox.width).toBeLessThanOrEqual(375)
  expect(toggleBox.x).toBeGreaterThanOrEqual(navBox.x + navBox.width)
  expect(navBox.height).toBeLessThan(30)
})
