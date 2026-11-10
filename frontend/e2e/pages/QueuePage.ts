import { expect, type Locator, type Page } from '@playwright/test'

export class QueuePage {
  readonly search: Locator
  readonly dataRows: Locator

  private readonly page: Page

  constructor(page: Page) {
    this.page = page
    this.search = page.getByRole('searchbox', { name: 'Search items' })
    this.dataRows = page.getByRole('row').filter({ has: page.getByRole('link') })
  }

  async goto(query = ''): Promise<void> {
    await this.page.goto(`/items${query}`)
    await expect(this.page.getByRole('heading', { name: 'Review Queue' })).toBeVisible()
  }

  row(title: string): Locator {
    return this.dataRows.filter({ hasText: title })
  }

  checkbox(title: string): Locator {
    return this.page.getByRole('checkbox', { name: `Select ${title}` })
  }

  async selectItems(...titles: string[]): Promise<void> {
    for (const title of titles) await this.checkbox(title).click()
  }

  async chooseFilter(label: string, option: string): Promise<void> {
    await this.page.getByRole('combobox', { name: label }).click()
    await this.page.getByRole('option', { name: option, exact: true }).click()
  }

  async sortBy(column: string): Promise<void> {
    await this.page.getByRole('columnheader', { name: column }).getByRole('button').click()
  }

  async setPerPage(perPage: number): Promise<void> {
    await this.page.getByRole('combobox', { name: 'Items per page' }).click()
    await this.page.getByRole('option', { name: `${perPage} / page` }).click()
  }

  async goToPage(page: number): Promise<void> {
    await this.page.getByRole('button', { name: `Page ${page}` }).click()
  }

  async titles(): Promise<string[]> {
    const links = await this.dataRows.getByRole('link').allInnerTexts()
    return links.map((t) => t.trim())
  }

  async bulkReview(input: {
    decision: 'Approve' | 'Reject'
    risk?: 'Low' | 'Medium' | 'High'
    note?: string
    reviewerName: string
  }): Promise<void> {
    await this.page.getByRole('textbox', { name: 'Reviewer name' }).fill(input.reviewerName)
    if (input.risk) {
      // The bulk bar renders after the toolbar, whose Risk filter shares the label.
      await this.page.getByRole('combobox', { name: 'Risk' }).last().click()
      await this.page.getByRole('option', { name: input.risk, exact: true }).click()
    }
    if (input.note) await this.page.getByRole('textbox', { name: 'Note' }).fill(input.note)
    await this.page.getByRole('button', { name: input.decision, exact: true }).click()
  }

  listError(): Locator {
    return this.page.getByRole('alert').filter({ hasText: 'Could not load items' })
  }

  retryButton(): Locator {
    return this.listError().getByRole('button', { name: 'Retry' })
  }
}
