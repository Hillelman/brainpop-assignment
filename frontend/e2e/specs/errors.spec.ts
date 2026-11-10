import { expect, test, uniqueName, uniqueTitle } from '../fixtures.ts'

test('a failing review request shows an error toast and the page stays usable', async ({
  page,
  submitPage,
  detailPage,
}) => {
  const title = uniqueTitle('Review 500')
  await submitPage.submit({ title, submitterName: uniqueName('Err Submitter') })

  await page.route('**/api/items/reviews', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Server error.', code: 'server_error' }),
    }),
  )
  await detailPage.review({ decision: 'Approve', reviewerName: uniqueName('Err Reviewer') })

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
