import { expect, test, uniqueTitle } from '../fixtures.ts'

test('a failing review request shows an error toast and the page stays usable', async ({
  page,
  submitPage,
  detailPage,
}) => {
  const title = uniqueTitle('Review 500')
  await submitPage.submit(title)

  await page.route('**/api/items/reviews', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Server error.', code: 'server_error' }),
    }),
  )
  await detailPage.review('Approve')

  await expect(
    page.getByText('Something went wrong on our side. Please try again later.'),
  ).toBeVisible()
  await detailPage.expectStatus('Pending')
  await expect(page.getByRole('button', { name: 'Submit review' })).toBeEnabled()
})

test('queue shows an inline error when the list request fails and Retry recovers', async ({
  page,
  queuePage,
}) => {
  const listUrl = /\/api\/items\?/
  await page.route(listUrl, (route) => route.abort())
  await page.goto('/items')

  await expect(queuePage.listError()).toBeVisible()
  await page.unroute(listUrl)
  await queuePage.retryButton().click()
  await expect(queuePage.listError()).toBeHidden()
  await expect(queuePage.dataRows.first()).toBeVisible()
})

test('a 401 while signed in stays on the queue with an inline error and no request loop', async ({
  page,
  queuePage,
}) => {
  let requests = 0
  await page.route(/\/api\/items(\/filters)?(\?|$)/, (route) => {
    requests += 1
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthenticated.', code: 'unauthenticated' }),
    })
  })
  await page.goto('/items')

  await expect(queuePage.listError()).toContainText('The server rejected your session')
  await page.waitForTimeout(3000)
  await expect(page).toHaveURL(/\/items/)
  expect(requests).toBeLessThanOrEqual(2)
})

test('pagination moves to page 2 with different items', async ({ page, queuePage }) => {
  await queuePage.goto('?state=all&perPage=10')
  await expect(queuePage.dataRows).toHaveCount(10)
  const firstPage = await queuePage.titles()

  await queuePage.goToPage(2)
  await expect(page).toHaveURL(/page=2/)
  await expect(queuePage.dataRows.first()).toBeVisible()
  const secondPage = await queuePage.titles()
  expect(secondPage.length).toBeGreaterThan(0)
  expect(secondPage.filter((t) => firstPage.includes(t))).toEqual([])
})
