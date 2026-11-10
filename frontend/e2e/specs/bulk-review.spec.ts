import { expect, test, uniqueName, uniqueTitle } from '../fixtures.ts'

test('bulk approve reviews pending items and skips an already reviewed one', async ({
  page,
  submitPage,
  detailPage,
  queuePage,
}) => {
  const suffix = uniqueTitle('Bulk')
  const titles = [`${suffix} A`, `${suffix} B`, `${suffix} C`]
  const submitterName = uniqueName('Bulk Submitter')
  const reviewerName = uniqueName('Bulk Reviewer')
  for (const title of titles) await submitPage.submit({ title, submitterName })
  await detailPage.review({ decision: 'Reject', note: 'Already handled', reviewerName })
  await detailPage.expectStatus('Rejected')

  await queuePage.goto(`?q=${encodeURIComponent(suffix)}`)
  await expect(queuePage.dataRows).toHaveCount(3)
  await queuePage.selectItems(...titles)
  await expect(page.getByText('1 already reviewed and will be skipped.')).toBeVisible()

  await queuePage.bulkReview({
    decision: 'Approve',
    risk: 'High',
    note: 'Bulk approved by E2E',
    reviewerName,
  })
  await expect(page.getByText('2 reviewed')).toBeVisible()

  await expect(queuePage.dataRows).toHaveCount(3)
  await expect(queuePage.row(titles[0]).getByText('Approved')).toBeVisible()
  await expect(queuePage.row(titles[1]).getByText('Approved')).toBeVisible()
  await expect(queuePage.row(titles[2]).getByText('Rejected')).toBeVisible()

  await queuePage.search.fill(titles[0])
  await expect(queuePage.dataRows).toHaveCount(1)
})
