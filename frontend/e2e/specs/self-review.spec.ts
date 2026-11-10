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

test('bulk review blocks items submitted by the reviewer until they are deselected', async ({
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
  await page.getByRole('textbox', { name: 'Reviewer name' }).fill(reviewer)

  const error = page.getByRole('alert').filter({ hasText: 'You submitted' })
  await expect(error).toHaveText(`You submitted “${own}”. Deselect it or use a different name.`)
  await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled()

  await queuePage.checkbox(own).click()
  await expect(error).toBeHidden()
  await queuePage.bulkReview({ decision: 'Approve', reviewerName: reviewer })

  await expect(page.getByText('2 reviewed')).toBeVisible()
  await expect(queuePage.row(own).getByText('Pending')).toBeVisible()
  for (const title of others) await expect(queuePage.row(title).getByText('Approved')).toBeVisible()
  await expect(queuePage.search).toBeEnabled()
})
