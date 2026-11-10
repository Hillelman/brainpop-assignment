import { expect, test, uniqueName, uniqueTitle } from '../fixtures.ts'

test('detail page blocks reviewing your own item until another name is typed', async ({
  submitPage,
  detailPage,
  page,
}) => {
  const ana = uniqueName('Ana Lopez')
  const id = await submitPage.submit({ title: uniqueTitle('Self review'), submitterName: ana })
  await detailPage.goto(id)

  await page.getByRole('radio', { name: 'Approve' }).check()
  await page.getByLabel('Reviewer name').fill(`  ${ana.toLowerCase()} `)
  await expect(detailPage.samePersonMessage()).toBeVisible()
  await expect(detailPage.submitReviewButton()).toBeDisabled()

  await detailPage.review({ decision: 'Approve', reviewerName: uniqueName('Ben Carter') })
  await detailPage.expectStatus('Approved')
})

test('bulk review skips items submitted by the reviewer and reviews the rest', async ({
  page,
  submitPage,
  queuePage,
}) => {
  const suffix = uniqueTitle('Self bulk')
  const own = `${suffix} own`
  const others = [`${suffix} other 1`, `${suffix} other 2`]
  const reviewer = uniqueName('Cara Diaz')
  await submitPage.submit({ title: own, submitterName: reviewer })
  for (const title of others) {
    await submitPage.submit({ title, submitterName: uniqueName('Someone Else') })
  }

  await queuePage.goto(`?q=${encodeURIComponent(suffix)}`)
  await expect(queuePage.dataRows).toHaveCount(3)
  await queuePage.selectItems(own, ...others)
  await queuePage.bulkReview({ decision: 'Approve', reviewerName: reviewer })

  await expect(page.getByText('1 skipped: you submitted them')).toBeVisible()
  await expect(page.getByText('2 reviewed')).toBeVisible()

  await queuePage.openTab('All')
  await expect(queuePage.row(own).getByText('Pending')).toBeVisible()
  for (const title of others) await expect(queuePage.row(title).getByText('Approved')).toBeVisible()
  await expect(queuePage.search).toBeEnabled()
})
