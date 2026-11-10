import { expect, test, uniqueName, uniqueTitle } from '../fixtures.ts'

test('submitting an item redirects to its detail page as Pending', async ({
  submitPage,
  detailPage,
  page,
}) => {
  const title = uniqueTitle('Submit flow')
  const submitterName = uniqueName('Submit Person')
  const id = await submitPage.submit({ title, submitterName })

  await expect(page).toHaveURL(new RegExp(`/items/${id}$`))
  await expect(detailPage.title(title)).toBeVisible()
  await detailPage.expectStatus('Pending')
  await expect(page.getByText(submitterName)).toBeVisible()
})
