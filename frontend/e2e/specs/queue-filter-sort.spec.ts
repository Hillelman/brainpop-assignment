import { expect, test, uniqueName, uniqueTitle } from '../fixtures.ts'

test('status filter and title sort apply, sync to the URL and survive reload', async ({
  page,
  queuePage,
}) => {
  await queuePage.goto()
  await queuePage.openTab('All')
  await queuePage.chooseFilter('Status', 'Approved')
  await queuePage.chooseSort('Title (A→Z)')

  await expect(page).toHaveURL(/filter%5Bstatus%5D=approved|filter\[status\]=approved/)
  await expect(page).toHaveURL(/sort=title/)

  const assertView = async (): Promise<void> => {
    await expect(queuePage.dataRows.first()).toBeVisible()
    const statuses = await queuePage.dataRows
      .getByText(/^(Pending|Approved|Rejected)$/)
      .allInnerTexts()
    expect(statuses.length).toBeGreaterThan(0)
    expect(new Set(statuses)).toEqual(new Set(['Approved']))

    const titles = await queuePage.titles()
    const sorted = [...titles].sort((a, b) => a.localeCompare(b))
    expect(titles).toEqual(sorted)
  }

  await assertView()
  await page.reload()
  await expect(page).toHaveURL(/sort=title/)
  await assertView()
})

test('submitter filter narrows the list to that submitter', async ({
  page,
  submitPage,
  queuePage,
}) => {
  const submitterName = uniqueName('Filter Person')
  const title = uniqueTitle('Submitter filter')
  await submitPage.submit({ title, submitterName })

  await queuePage.goto()
  await queuePage.chooseFilter('Submitter', submitterName)

  await expect(page).toHaveURL(/submitter/)
  await expect(queuePage.dataRows).toHaveCount(1)
  await expect(queuePage.row(title)).toContainText(submitterName)
})
