import { expect, test, uniqueName, uniqueTitle } from '../fixtures.ts'

test('a new submitter appears in the Submitter filter after an in-app round trip', async ({
  page,
  queuePage,
}) => {
  // The only full page load: everything after this is client-side navigation.
  await queuePage.goto()
  const submitter = page.getByRole('combobox', { name: 'Submitter' })
  await submitter.click()
  await expect(page.getByRole('option').first()).toBeVisible()
  await page.keyboard.press('Escape')

  const submitterName = uniqueName('Refresh Person')
  await page.getByRole('link', { name: 'Submit', exact: true }).click()
  await page.getByRole('heading', { name: 'Submit Item' }).waitFor()
  await page.getByLabel('Your name').fill(submitterName)
  await page.getByLabel('Title').fill(uniqueTitle('Refresh flow'))
  await page.getByLabel('Description').fill('Created by the E2E suite.')
  await page.getByRole('button', { name: 'Submit item' }).click()
  await page.waitForURL(/\/items\/\d+$/)

  await page.getByRole('link', { name: 'Back to queue' }).click()
  await expect(page.getByRole('heading', { name: 'Review Queue' })).toBeVisible()

  await submitter.click()
  await expect(page.getByRole('option', { name: submitterName, exact: true })).toBeVisible()
})
