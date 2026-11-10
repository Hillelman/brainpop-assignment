import { expect, test, uniqueName, uniqueTitle } from '../fixtures.ts'

test('status filter and title sort apply, sync to the URL and survive reload', async ({
  page,
  queuePage,
}) => {
  await queuePage.goto()
  await queuePage.chooseFilter('Status', 'Approved')
  await queuePage.sortBy('Title')

  await expect(page).toHaveURL(/filter%5Bstatus%5D=approved|filter\[status\]=approved/)
  await expect(page).toHaveURL(/sort=title(&|$)/)

  const assertView = async (direction: 'asc' | 'desc'): Promise<void> => {
    await expect(queuePage.dataRows.first()).toBeVisible()
    const statuses = await queuePage.dataRows
      .getByText(/^(Pending|Approved|Rejected)$/)
      .allInnerTexts()
    expect(statuses.length).toBeGreaterThan(0)
    expect(new Set(statuses)).toEqual(new Set(['Approved']))

    const titles = await queuePage.titles()
    const sorted = [...titles].sort((a, b) => a.localeCompare(b))
    if (direction === 'desc') sorted.reverse()
    expect(titles).toEqual(sorted)
  }

  await assertView('asc')
  await page.reload()
  await expect(page).toHaveURL(/sort=title(&|$)/)
  await assertView('asc')

  await queuePage.sortBy('Title')
  await expect(page).toHaveURL(/sort=-title/)
  await assertView('desc')
  await page.reload()
  await expect(page).toHaveURL(/sort=-title/)
  await assertView('desc')
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

test('status and submitter headers are sortable and sync to the URL', async ({
  page,
  queuePage,
}) => {
  await queuePage.goto()

  for (const [column, key] of [
    ['Status', 'status'],
    ['Submitter', 'submitter'],
  ] as const) {
    await queuePage.sortBy(column)
    await expect(page).toHaveURL(new RegExp(`sort=${key}(&|$)`))
    await expect(queuePage.dataRows.first()).toBeVisible()
    await expect(page.getByRole('columnheader', { name: column })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )

    await queuePage.sortBy(column)
    await expect(page).toHaveURL(new RegExp(`sort=-${key}`))
    await expect(page.getByRole('columnheader', { name: column })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    await expect(page.getByText(/could not|error/i)).toHaveCount(0)
  }
})
