# User guide

How to submit items, work the review queue and review items one at a time or in bulk.

## Contents

- [Opening the app](#opening-the-app)
- [Submitting an item](#submitting-an-item)
- [The queue view](#the-queue-view)
- [Sorting](#sorting)
- [Bulk review](#bulk-review)
- [The item detail page](#the-item-detail-page)

## Opening the app

Open http://localhost:5173. There is no sign-in: anyone who can reach the app can use it. Instead of an account, you type your name when you submit an item or review one. See [Identity and names](identity-and-names.md) for how names are matched, and for the note that nothing stops someone from typing another person's name.

The header has two links: **Queue** and **Submit**.

## Submitting an item

1. Click **Submit**.
2. Enter **Your name** (2 to 60 characters; the count is shown under the field), a **Title** (3 to 120 characters) and a **Description** (required, up to 5000 characters).
3. Click **Submit item**.

Problems are shown under the field they belong to, for example "Your name must be at least 2 characters." On success a toast says "Item submitted" and you are taken to the new item's page. New items start as `pending`, and your name is shown as the submitter.

## The queue view

The queue is at `/items`. It shows all items by default, newest first. Everything you set here is stored in the URL, so you can copy the address to share the exact view and it survives a reload.

- **Search**: the search box sits at the end of the filter row. It matches title and description, case-insensitive, up to 100 characters. Results update after a short pause (300 ms). The **x** button clears the search.
- **Filters**: Status, Risk, Submitter (a dropdown of everyone who has submitted an item), Created from and Created to. The controls come from the API, so new filters appear automatically. To see only pending items, set the Status filter to Pending. **Clear filters** resets them. See [Filters and sorting](filters-and-sorting.md).
- **Sort**: click a column header; see [Sorting](#sorting).
- **Pagination**: choose 10, 25 (default) or 50 items per page and move between pages. Changing the search, filters or sort returns to page 1.
- **Table**: shows title (a link to the item), status, risk, submitter and creation time in your local time zone.

The URL uses these parameters:

| Parameter | Example | Notes |
| --- | --- | --- |
| `q` | `q=login` | Search text. |
| `filter[<key>]` | `filter[risk]=high` | One per active filter. |
| `sort` | `sort=title` | Add `-` for descending, for example `sort=-title`. Omitted for the default, newest first. |
| `page` | `page=2` | Omitted for page 1. |
| `perPage` | `perPage=50` | Omitted for 25. |

Example: `/items?filter[status]=pending&sort=risk&page=2`. Invalid values in a hand-edited URL are corrected or dropped; if the API rejects the combination you see an "Invalid search or filters" message with a **Reset** button.

Empty states: "No items yet" when there is nothing, or "No results for ..." with a **Clear filters** button when search or filters match nothing.

## Sorting

Sort by clicking a column header: **Title**, **Status**, **Risk**, **Submitter** or **Created**.

- An arrow next to the header shows the active column and its direction (up for ascending, down for descending). Other headers show a faint arrow on hover.
- **Created** starts newest-first, which is the default view. Every other column starts ascending.
- Clicking the active column again toggles the direction.
- Status sorts pending, then approved, then rejected. Submitter sorts by name, ignoring case. Items with no risk always sort last.
- On a phone the table becomes a list of cards with a compact **Sort: ...** menu above it. Pick a column from the menu; picking the active one flips its direction.
- The choice is kept in the URL (`sort=-title`) and returns to page 1.

## Bulk review

1. Tick the checkboxes of the items you want, or use the header checkbox to select the whole page. The selection is cleared when you change the search, filters, sort or page.
2. A bar appears at the bottom showing how many are selected. Items that are already reviewed are listed as "N already reviewed and will be skipped."
3. Type the **Reviewer name** (2 to 60 characters). The Approve and Reject buttons stay disabled until it is valid.
4. Optionally choose a **Risk** (low, medium, high or no risk) and write a **Note** (up to 1000 characters).
5. Click **Approve** or **Reject**.

You cannot review an item you submitted. If the reviewer name matches an item's submitter (same name after trimming, collapsing spaces and ignoring case), that item is skipped and the rest are still reviewed.

Results appear as toasts:

- "N reviewed" for the items that were updated.
- A warning listing what was left out, for example "2 skipped: you submitted them, 1 already reviewed". The reasons are "skipped: you submitted them", "already reviewed" and "not found". The rest of the batch still succeeds.
- If every selected item was skipped, only the warning is shown (no "N reviewed").
- An error toast if the whole request failed; nothing was changed and you can try again.

After the review the list refreshes and the selection is cleared. An item is reviewed only once; if no risk is chosen, the item keeps whatever risk it had.

## The item detail page

Click an item's title to open `/items/<id>`. It shows the title, description, status, risk, the person who submitted it, dates and the **review history** (newest first, with a **Load more** control for long histories).

- **Review**: for a pending item, a form lets you choose Approve or Reject, type a **Reviewer name**, choose a risk and an optional note, then **Submit review**. If your name matches the submitter, the form shows "You can't review an item you submitted" and the button is disabled until you change the name. If someone else reviewed it first you get an info toast ("Already reviewed by someone else") and the page refreshes.
- **Share**: click **Copy link** to copy the page address. Anyone with access to the app can open it.
- **Back to queue**: returns to the queue with the filters and page you came from.
- **Missing items**: an unknown or removed item shows "Item not found" with a link back to the queue.
