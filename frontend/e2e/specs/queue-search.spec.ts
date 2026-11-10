import { expect, test, uniqueName, uniqueTitle } from '../fixtures.ts'

test('search fires one request after typing stops and clearing restores the list', async ({
  page,
  submitPage,
  queuePage,
}) => {
  const title = uniqueTitle('Quokka search')
  await submitPage.submit({ title, submitterName: uniqueName('Search Person') })
  await queuePage.goto()
  await expect(queuePage.dataRows.first()).toBeVisible()
  const initialCount = await queuePage.dataRows.count()
  expect(initialCount).toBeGreaterThan(1)

  let searchRequests = 0
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/api/items/search')) searchRequests += 1
  })

  const response = page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/items/search'))
  await queuePage.search.pressSequentially(title, { delay: 20 })
  await response

  await expect(queuePage.dataRows).toHaveCount(1)
  await expect(queuePage.row(title)).toBeVisible()
  await page.waitForTimeout(600)
  expect(searchRequests).toBe(1)

  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect(queuePage.search).toHaveValue('')
  await expect(queuePage.dataRows).not.toHaveCount(1)
})
