# User guide

How to sign in, submit items, work the review queue and review items one at a time or in bulk.

## Contents

- [Signing in](#signing-in)
- [Submitting an item](#submitting-an-item)
- [The queue view](#the-queue-view)
- [Bulk review](#bulk-review)
- [The item detail page](#the-item-detail-page)

## Signing in

Open http://localhost:5173. Anyone who is not signed in is sent to the sign-in page, which is the Clerk sign-in form. After signing in you land on the page you originally asked for (only paths inside the app are honored) or on the queue. The user menu at the top right lets you manage your account and sign out. If your session expires, the next request sends you back to the sign-in page and returns you to where you were afterwards.

The header has two links: **Queue** and **Submit**.

## Submitting an item

1. Click **Submit**.
2. Enter a **Title** (3 to 120 characters) and a **Description** (required, up to 5000 characters).
3. Click **Submit item**.

Problems are shown under the field they belong to. On success a toast says "Item submitted" and you are taken to the new item's page. New items start as `pending`.

## The queue view

The queue is at `/items`. Everything you set here is stored in the URL, so you can copy the address to share the exact view and it survives a reload.

- **Tabs**: **Pending** (not yet reviewed, the default), **Reviewed** (approved or rejected) and **All**.
- **Search**: type in the search box to match title and description, case-insensitive, up to 100 characters. Results update after a short pause (300 ms). The **x** button clears the search.
- **Filters**: Status, Risk, Submitter (everyone or mine), Created from and Created to. The controls come from the API, so new filters appear automatically. **Clear filters** resets them. See [Filters and sorting](filters-and-sorting.md).
- **Sort**: pick one option from the sort menu. Each of Created, Updated, Title and Risk has both directions, for example "Created (newest first)" and "Created (oldest first)", "Title (A→Z)" and "Title (Z→A)", "Risk (high → low)" and "Risk (low → high)". The default is Created (newest first). The choice is kept in the URL (`sort=-title`).
- **Pagination**: choose 10, 25 (default) or 50 items per page and move between pages. Changing the tab, search, filters or sort returns to page 1.
- **Table**: shows title (a link to the item), status, risk, submitter and creation time in your local time zone.

The URL uses these parameters:

| Parameter | Example | Notes |
| --- | --- | --- |
| `state` | `state=reviewed` | Omitted for `pending`, the default tab. |
| `q` | `q=login` | Search text. |
| `filter[<key>]` | `filter[risk]=high` | One per active filter. |
| `sort` | `sort=title` | Add `-` for descending, for example `sort=-title`. |
| `page` | `page=2` | Omitted for page 1. |
| `perPage` | `perPage=50` | Omitted for 25. |

Example: `/items?state=all&filter[submitter]=mine&sort=risk&page=2`. Invalid values in a hand-edited URL are corrected or dropped; if the API rejects the combination you see an "Invalid search or filters" message with a **Reset** button.

Empty states: "No items yet" when there is nothing, or "No results for ..." with a **Clear filters** button when search or filters match nothing.

## Bulk review

1. Tick the checkboxes of the items you want, or use the header checkbox to select the whole page. The selection is cleared when you change the tab, search, filters, sort or page.
2. A bar appears at the bottom showing how many are selected. Items that are already reviewed are listed as "N already reviewed and will be skipped".
3. Optionally choose a **Risk** (low, medium, high or no risk) and write a **Note** (up to 1000 characters).
4. Click **Approve** or **Reject**.

Results appear as toasts:

- "N reviewed" for the items that were updated.
- A warning such as "3 could not be reviewed: 2 already reviewed, 1 not found" when some failed, for example because someone else reviewed them first or they no longer exist. The rest of the batch still succeeds.
- An error toast if the whole request failed; nothing was changed and you can try again.

After the review the list refreshes and the selection is cleared. An item is reviewed only once; if no risk is chosen, the item keeps whatever risk it had.

## The item detail page

Click an item's title to open `/items/<id>`. It shows the title, description, status, risk, submitter, dates and the **review history** (newest first, with a **Load more** control for long histories).

- **Review**: for a pending item, a form lets you choose Approve or Reject, a risk and an optional note, then **Submit review**. If someone else reviewed it first you get an info toast and the page refreshes.
- **Share**: click **Copy link** to copy the page address. Anyone with access to the app can open it after signing in; the sign-in redirect brings them straight to the item.
- **Back to queue**: returns to the queue with the filters and page you came from.
- **Missing items**: an unknown or removed item shows "Item not found" with a link back to the queue.
