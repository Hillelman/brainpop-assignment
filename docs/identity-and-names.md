# Identity and names

How the app knows who submitted and who reviewed an item, without any sign-in.

## Contents

- [Security note](#security-note)
- [How names identify people](#how-names-identify-people)
- [Normalization rules](#normalization-rules)
- [Examples](#examples)
- [The self-review rule](#the-self-review-rule)
- [Where names are entered](#where-names-are-entered)
- [Old data](#old-data)

## Security note

**There is no authentication.** The API is open: no sign-in, no tokens, no sessions and no `Authorization` header. A name is just text that the person types, so anyone can type any name, including the name of someone else, and the app cannot tell the difference. The self-review rule below is a guard against honest mistakes, not a security control: someone who wants to review their own item can simply type a different name.

Do not expose this app on a public network or use it where real accountability is needed. Adding real authentication is out of scope here.

## How names identify people

Every submit request carries a `submitter_name` and every review request carries a `reviewer_name`. The backend turns the name into a user record with a find-or-create step (`UserRepository::findOrCreateByName`):

1. The name is normalized (see below) and compared with the existing users using its case-insensitive key.
2. If a user with the same key exists, that user is used.
3. Otherwise a new user `{id, name, created_at}` is appended with the normalized name, keeping the casing of the first time it was typed.

The whole find-or-create runs inside the users-file transaction (an exclusive lock), so two concurrent requests with the same new name create exactly one user. Items and reviews store only the user id, so the display name shown everywhere is the one saved on first sight.

## Normalization rules

- Leading and trailing whitespace is removed.
- Every run of whitespace inside the name (spaces, tabs, line breaks) becomes one space.
- After that, the name must be 2 to 60 characters long. Anything else is a `422 validation_failed` on that field, and a name that is only whitespace counts as too short.
- Two names are the same person when they are equal after normalization and lower-casing. Accents are significant.
- A name that looks like an email address is just a normal name.

The browser applies the same trimming and length check before sending, and shows the character count under the field.

## Examples

| Typed | Result |
| --- | --- |
| `Ana  Lopez` and `ana lopez` | Same person. The saved name is whichever was typed first, with spaces collapsed. |
| `  ana lopez  ` | Same person as `Ana Lopez`. |
| `José` and `Jose` | Different people. |
| `   ` | Rejected: too short after normalization. |
| `A` | Rejected: fewer than 2 characters. |
| 61 characters | Rejected: more than 60 characters. |
| `ana@example.com` | Accepted as a normal name. |

## The self-review rule

A person cannot review an item they submitted. The check compares user ids, so it uses the rules above: submitting as `Ana Lopez` and then reviewing as ` ana  lopez ` is blocked.

- **API:** `POST /api/items/reviews` reports the item in `failed` with `reason: "same_person"`. The item stays pending, and the other items in the batch are still reviewed. If every item is `same_person`, the response is still `200` with all of them in `failed`. See [Endpoints](endpoints.md#post-apiitemsreviews).
- **Item page:** as soon as the reviewer name matches the submitter, the form shows "You can't review an item you submitted" and disables **Submit review**.
- **Bulk bar:** the bar checks the reviewer name against the submitter of every selected item as you type. On a match it shows an inline error (for one item, `You submitted “<title>”. Deselect it or use a different name.`) and disables **Approve** and **Reject** until you deselect those items or change the name, so nothing is sent. If the server still reports `same_person` for every item, the same inline error is shown. See [User guide](user-guide.md#bulk-review).

## Where names are entered

| Place | Field | Request field |
| --- | --- | --- |
| Submit page | **Your name** | `submitter_name` |
| Item page review form | **Reviewer name** | `reviewer_name` |
| Bulk action bar | **Reviewer name** | `reviewer_name` |

Names are not remembered between visits; type them each time. The queue also has a **Submitter** filter that lists everyone who has submitted an item; see [Filters and sorting](filters-and-sorting.md).

## Old data

Earlier versions identified people with an external-provider id and an `email` in `users.json`. Those rows still load: the extra fields are ignored, and only `id`, `name` and `created_at` are used. Old display names may not follow the normalization rules, so the same person can end up under two names. To start clean with demo data, run:

```bash
php backend/artisan app:seed-json --fresh
```

See [Data model](data-model.md#resetting-data).
