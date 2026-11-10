import { expect, test } from '@playwright/test'

test('app root responds', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Review Queue' })).toBeVisible()
})
