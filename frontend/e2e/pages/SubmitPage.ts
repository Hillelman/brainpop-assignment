import type { Page } from '@playwright/test'

export class SubmitPage {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto(): Promise<void> {
    await this.page.goto('/items/new')
    await this.page.getByRole('heading', { name: 'Submit Item' }).waitFor()
  }

  /** Submits an item and resolves with the id parsed from the detail URL it redirects to. */
  async submit(title: string, description = 'Created by the E2E suite.'): Promise<number> {
    await this.goto()
    await this.page.getByLabel('Title').fill(title)
    await this.page.getByLabel('Description').fill(description)
    await this.page.getByRole('button', { name: 'Submit item' }).click()
    await this.page.waitForURL(/\/items\/\d+$/)
    return Number(new URL(this.page.url()).pathname.split('/').pop())
  }
}
