import { expect, test } from '../fixtures.ts'

test('status filter and title sort apply, sync to the URL and survive reload', async ({
  page,
  queuePage,
}) => {
  await queuePage.goto()
  await queuePage.openTab('All')
  await queuePage.chooseFilter('Status', 'Approved')
  await queuePage.chooseSort('Title')

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
