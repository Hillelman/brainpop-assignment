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

Illegal actions never produce a 500. A 500 carries the generic message `Server error`; stack traces are only added when `APP_DEBUG=true` (and never under tests).

## Status and code reference

| Status | `code` | Produced by | Notes |
| --- | --- | --- | --- |
| 401 | `unauthenticated` | Any endpoint except `/api/health` | Missing bearer token, invalid or expired token, wrong issuer or authorized party, or the JWKS could not be loaded. |
| 403 | `forbidden` | Authorization exceptions | Reserved; no current endpoint returns it. |
| 404 | `not_found` | `GET /api/items/{id}`, `GET /api/items/{id}/reviews`, unknown routes (including a non-numeric id) | Message is `Item not found.` for items, `Not found.` for routes. |
| 405 | `method_not_allowed` | Wrong HTTP method on a known path | Includes the `Allow` header. |
| 409 | `conflict` | Domain rule violations that raise a `DomainException` | The default for business-rule conflicts. Bulk review reports per-item problems in the response body instead. |
| 422 | `validation_failed` | `GET /api/items`, `GET /api/items/search`, `GET /api/items/{id}/reviews`, `POST /api/items`, `POST /api/items/reviews` | Includes unknown `filter[...]` keys, invalid `sort`, `per_page` or `page`, a `q` over 100 characters. `errors` maps fields to messages. |
| 429 | `too_many_requests` | Rate limiting, if configured | Includes `Retry-After`. |
| other 4xx/5xx | `http_error` | Other HTTP exceptions | Uses the exception's message. |
| 500 | `server_error` | Any unexpected failure, including a corrupt JSON data file | Generic message. Details are in `backend/storage/logs`. |

## Partial failures in bulk review

`POST /api/items/reviews` returns `200` even when some items fail. Per-item problems are listed in `data.failed` as `{ "id", "reason" }` with `reason` of `not_found` or `already_reviewed`, and counted in `meta.failed_count`. See [Endpoints](endpoints.md#post-apiitemsreviews).

## How the UI presents errors

The frontend wraps every failure in an `ApiError` (`frontend/src/api/http.ts`) carrying `status`, `code` and `fieldErrors`, and maps `code` to a friendly message in `frontend/src/lib/errors.ts`. Network failures become `network_error` with status 0.

| Situation | Presentation |
| --- | --- |
| `401` on any call | The unauthorized handler redirects to `/sign-in?redirect=<current path>`. After sign-in you return to the page you were on. |
| `422` when submitting an item | Messages appear inline under the title or description field. If no field message is available, an error toast is shown. |
| `422` on the queue list (bad search or filters, for example from a hand-edited URL) | An "Invalid search or filters" alert with a **Reset** button that clears the query. |
| Other failure loading the queue | A "Could not load items" alert with a **Retry** button. |
| Filter metadata fails to load | "Filters could not be loaded." with a **Retry** button; the list still works. |
| Item detail `404` | The "Item not found" empty state with a link back to the queue. |
| Other failure loading an item | An inline alert message with a **Retry** button. |
| Review submit failure (detail page or bulk bar) | An error toast. |
| Bulk review with partial failures | A success toast ("N reviewed") plus a warning toast ("N could not be reviewed: 2 already reviewed, 1 not found"). |
| Review of an item someone else already reviewed | An info toast ("Already reviewed by someone else") and the page refreshes. |
| Unknown frontend route | The not-found page. |
| Unexpected rendering error | The `ErrorBoundary` card "Something went wrong" with a **Retry** button. |
| `VITE_CLERK_PUBLISHABLE_KEY` missing | A configuration error screen instead of the app. |

Friendly messages by code: `validation_failed` ("Some fields are invalid..."), `not_found`, `conflict`, `unauthenticated` ("Your session has expired. Please sign in again."), `network_error`, `server_error`, and a generic fallback for anything else.
