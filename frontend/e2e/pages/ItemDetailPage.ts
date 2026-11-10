import { expect, type Locator, type Page } from '@playwright/test'

export class ItemDetailPage {
  readonly status: Locator
  readonly historyEntries: Locator

  private readonly page: Page

  constructor(page: Page) {
    this.page = page
    this.status = page.getByRole('article').getByText(/^(Pending|Approved|Rejected)$/)
    this.historyEntries = page.getByRole('listitem').filter({ hasText: /^(Approved|Rejected)/ })
  }

  async goto(id: number | string): Promise<void> {
    await this.page.goto(`/items/${id}`)
  }

  title(text: string): Locator {
    return this.page.getByRole('heading', { name: text, level: 1 })
  }

  async review(input: {
    decision: 'Approve' | 'Reject'
    risk?: 'Low' | 'Medium' | 'High'
    note?: string
    reviewerName: string
  }): Promise<void> {
    await this.page.getByRole('radio', { name: input.decision }).check()
    await this.page.getByLabel('Reviewer name').fill(input.reviewerName)
    if (input.risk) await this.page.getByLabel('Risk').selectOption({ label: input.risk })
    if (input.note) await this.page.getByLabel('Note (optional)').fill(input.note)
    await this.page.getByRole('button', { name: 'Submit review' }).click()
  }

  samePersonMessage(): Locator {
    return this.page.getByText("You can't review an item you submitted")
  }

  submitReviewButton(): Locator {
    return this.page.getByRole('button', { name: 'Submit review' })
  }

  async expectStatus(status: 'Pending' | 'Approved' | 'Rejected'): Promise<void> {
    await expect(this.status).toHaveText(status)
  }

  notFound(): Locator {
    return this.page.getByText('Item not found')
  }

  backToQueueLink(): Locator {
    return this.page.getByRole('link', { name: 'Back to queue' }).last()
  }
}
