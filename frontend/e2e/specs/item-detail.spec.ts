import { expect, test, uniqueName, uniqueTitle } from '../fixtures.ts'
import { ItemDetailPage } from '../pages/ItemDetailPage.ts'

test('deep link loads the item and a rejection updates status and history', async ({
  browser,
  submitPage,
}) => {
  const title = uniqueTitle('Deep link')
  const id = await submitPage.submit({ title, submitterName: uniqueName('Deep Submitter') })

  const fresh = await browser.newContext()
  const freshPage = await fresh.newPage()
  const detail = new ItemDetailPage(freshPage)

  await detail.goto(id)
  await expect(detail.title(title)).toBeVisible()
  await detail.expectStatus('Pending')

  const note = `Rejected by E2E ${id}`
  await detail.review({
    decision: 'Reject',
    risk: 'Low',
    note,
    reviewerName: uniqueName('Deep Reviewer'),
  })

  await detail.expectStatus('Rejected')
  await expect(detail.historyEntries).toHaveCount(1)
  await expect(detail.historyEntries.first()).toContainText(note)
  await fresh.close()
})

test('unknown item id shows the not-found state with a link back to the queue', async ({
  detailPage,
  page,
}) => {
  await detailPage.goto(99999999)
  await expect(detailPage.notFound()).toBeVisible()
  await detailPage.backToQueueLink().click()
  await expect(page).toHaveURL(/\/items(\?.*)?$/)
})
