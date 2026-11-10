# Errors

How the API reports errors and how the UI presents each one.

## Contents

- [The error contract](#the-error-contract)
- [Status and code reference](#status-and-code-reference)
- [Partial failures in bulk review](#partial-failures-in-bulk-review)
- [How the UI presents errors](#how-the-ui-presents-errors)

## The error contract

Every error response under `/api` is JSON with the same shape, produced in `backend/bootstrap/app.php`:

```json
{
  "message": "The given data was invalid.",
  "code": "validation_failed",
  "errors": { "title": ["The title field must be at least 3 characters."] }
}
```

- `message`: human-readable text.
- `code`: a stable machine-readable string. Clients should branch on this.
- `errors`: only on `422`, a map of field name to a list of messages.

There is no authentication, so there is no `401` and no sign-in error. Illegal actions never produce a 500. A 500 carries the generic message `Server error`; stack traces are only added when `APP_DEBUG=true` (and never under tests).

## Status and code reference

| Status        | `code`                                      | Produced by                                                                                                            | Notes                                                                                                                                   |
| ------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 403           | `forbidden`                                 | Authorization exceptions                                                                                               | Reserved; no current endpoint returns it.                                                                                               |
| 404           | `not_found`                                 | `GET /api/items/{id}`, `GET /api/items/{id}/reviews`, unknown routes (including a non-numeric id)                      | Message is `Item not found.` for items, `Not found.` for routes.                                                                        |
| 503           | `app_not_configured`                        | Any `/api` route except `/api/health` when `APP_KEY` is missing                                                        | `errors.missing` lists the missing env var names (no values). See [Troubleshooting](troubleshooting.md).                                |
| 405           | `method_not_allowed`                        | Wrong HTTP method on a known path                                                                                      | Includes the `Allow` header.                                                                                                            |
| 409           | `conflict`                                  | Domain rule violations that raise a `DomainException`                                                                  | The default for business-rule conflicts. Bulk review reports per-item problems in the response body instead.                            |
| 422           | `validation_failed`                         | `GET /api/items`, `GET /api/items/search`, `GET /api/items/{id}/reviews`, `POST /api/items`, `POST /api/items/reviews` | Includes unknown `filter[...]` keys, invalid `sort`, `per_page` or `page`, a `q` over 100 characters, and a missing, blank, too short or too long `submitter_name` / `reviewer_name`. `errors` maps fields to messages. |
| 429           | `too_many_requests`                         | Rate limiting, if configured                                                                                           | Includes `Retry-After`.                                                                                                                 |
| other 4xx/5xx | `http_error`                                | Other HTTP exceptions                                                                                                  | Uses the exception's message.                                                                                                           |
| 500           | `server_error`                              | Any unexpected failure, including a corrupt JSON data file                                                             | Generic message. Details are in `backend/storage/logs`.                                                                                 |

## Partial failures in bulk review

`POST /api/items/reviews` returns `200` even when some items fail. Per-item problems are listed in `data.failed` as `{ "id", "reason" }` with `reason` of `not_found`, `already_reviewed` or `same_person`, and counted in `meta.failed_count`. `same_person` means the reviewer name matches the item's submitter; the item stays pending. A batch where every item fails is still a `200`. See [Endpoints](endpoints.md#post-apiitemsreviews) and [Identity and names](identity-and-names.md#the-self-review-rule).

## How the UI presents errors

The frontend wraps every failure in an `ApiError` (`frontend/src/api/http.ts`) carrying `status`, `code` and `fieldErrors`, and maps `code` to a friendly message in `frontend/src/lib/errors.ts`. Network failures become `network_error` with status 0.

| Situation                                                                           | Presentation                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `503` `app_not_configured`                                                          | Inline "The backend is not configured: missing <VAR, ...>" (or "The backend is not configured." when `errors.missing` is absent) with **Retry**.                                                                                                                                                      |
| Network failure (backend down)                                                      | Inline "Cannot reach the API at <base url>" with **Retry**. One request per user action, with no automatic retry.                                                                                                                                                                                     |
| `VITE_API_BASE_URL` missing or empty                                                | Defaults to `http://localhost:8000/api`, so requests never go to the Vite server.                                                                                                                                                                                                                     |
| `422` when submitting an item                                                       | Messages appear inline under the name, title or description field. If no field message is available, an error toast is shown.                                                                                                                                                                               |
| `422` on the queue list (bad search or filters, for example from a hand-edited URL) | An "Invalid search or filters" alert with a **Reset** button that clears the query.                                                                                                                                                                                                                   |
| Other failure loading the queue                                                     | A "Could not load items" alert with a **Retry** button.                                                                                                                                                                                                                                               |
| Filter metadata fails to load                                                       | "Filters could not be loaded." with a **Retry** button; the list still works. The store does not refetch on remount after a failure; only **Retry** does.                                                                                                                                             |
| Item detail `404`                                                                   | The "Item not found" empty state with a link back to the queue.                                                                                                                                                                                                                                       |
| Other failure loading an item                                                       | An inline alert message with a **Retry** button.                                                                                                                                                                                                                                                      |
| `422` on `reviewer_name` (detail page or bulk bar)                                  | The message appears under the **Reviewer name** field. Other review failures show an error toast. |
| `same_person` on the detail page                                                    | "You can't review an item you submitted" under the reviewer name, and the **Submit review** button is disabled. The form checks this as you type, so it rarely reaches the server. |
| `same_person` in a bulk review                                                      | Inline error in the bulk bar / detail form, shown before submitting: the bar names the items you submitted and keeps **Approve** and **Reject** disabled. If the server still reports `same_person` for every item, the same inline error is shown. |
| Bulk review with partial failures                                                   | A success toast ("N reviewed") plus a warning toast listing the rest, for example "2 already reviewed, 1 not found".                                                                                                                                                                                     |
| Review of an item someone else already reviewed                                     | An info toast ("Already reviewed by someone else") and the page refreshes.                                                                                                                                                                                                                            |
| Unknown frontend route                                                              | The not-found page.                                                                                                                                                                                                                                                                                   |
| Unexpected rendering error                                                          | The `ErrorBoundary` card "Something went wrong" with a **Retry** button.                                                                                                                                                                                                                              |

Friendly messages by code: `validation_failed` ("Some fields are invalid..."), `not_found`, `conflict`, `network_error`, `app_not_configured`, `server_error`, and a generic fallback for anything else.
