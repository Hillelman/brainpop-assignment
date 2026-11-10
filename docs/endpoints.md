# Endpoints

Reference for every HTTP endpoint of the Review Queue API.

## Contents

- [Conventions](#conventions)
- [GET /api/health](#get-apihealth)
- [GET /api/me](#get-apime)
- [GET /api/items](#get-apiitems)
- [GET /api/items/search](#get-apiitemssearch)
- [GET /api/items/filters](#get-apiitemsfilters)
- [GET /api/items/{id}](#get-apiitemsid)
- [GET /api/items/{id}/reviews](#get-apiitemsidreviews)
- [POST /api/items](#post-apiitems)
- [POST /api/items/reviews](#post-apiitemsreviews)

## Conventions

- Base URL in development: `http://localhost:8000/api`.
- Every endpoint except `/api/health` needs `Authorization: Bearer <Clerk session JWT>` (see [Authentication](authentication.md)). The examples use `$TOKEN` for it.
- Send `Accept: application/json`, and `Content-Type: application/json` for request bodies.
- Success bodies are wrapped in `{ "data": ... }`. Paginated lists add Laravel's `links` and `meta`. The fields the UI relies on are `meta.current_page`, `meta.per_page`, `meta.total` and `meta.last_page`.
- Errors always use `{ "message", "code", "errors"? }`; see [Errors](errors.md).
- Timestamps are UTC ISO-8601 strings.
- A `page` beyond the last page is not an error: it returns `200` with an empty `data` array and correct `meta`.

An **item** looks like this:

```json
{
  "id": 1,
  "title": "Login redesign",
  "description": "New layout",
  "status": "approved",
  "risk": "low",
  "submitter": { "id": 1, "name": "Alice Johnson" },
  "created_at": "2026-11-10T14:06:04+00:00",
  "updated_at": "2026-11-10T14:20:41+00:00",
  "latest_review": {
    "id": 1,
    "decision": "approved",
    "risk": "low",
    "note": "ok",
    "reviewer": { "id": 2, "name": "Bob Smith" },
    "created_at": "2026-11-10T14:20:41+00:00"
  }
}
```

`status` is `pending`, `approved` or `rejected`. `risk` is `low`, `medium`, `high` or `null`. `latest_review` is `null` until the item is reviewed.

## GET /api/health

Liveness check.

- Auth: none.
- Parameters: none.

Response `200`:

```json
{ "status": "ok" }
```

```bash
curl http://localhost:8000/api/health
```

## GET /api/me

The current user. The user record is created on the first authenticated request.

- Auth: required.
- Parameters: none.

Response `200`:

```json
{ "data": { "id": 1, "name": "Alice Johnson", "email": "alice@example.com" } }
```

Errors: `401 unauthenticated`.

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/me
```

## GET /api/items

Paginated item list with state scope, filters and sorting.

- Auth: required.

Query parameters:

| Name | Type | Required | Default | Validation |
| --- | --- | --- | --- | --- |
| `state` | string | no | `all` | One of `pending`, `reviewed`, `all`. `pending` means not yet reviewed, `reviewed` means approved or rejected. |
| `filter[status]` | string | no | none | `pending`, `approved` or `rejected`. |
| `filter[risk]` | string | no | none | `low`, `medium`, `high` or `none` (items without a risk). |
| `filter[submitter]` | string | no | none | `mine` or `everyone`. |
| `filter[created_from]` | date | no | none | `YYYY-MM-DD`, inclusive from the start of that UTC day. |
| `filter[created_to]` | date | no | none | `YYYY-MM-DD`, inclusive to the end of that UTC day; must not be earlier than `filter[created_from]`. |
| `sort` | string | no | `-created_at` | One of `created_at`, `updated_at`, `title`, `risk`; prefix with `-` for descending. Items with no risk always sort last. Ties break on `id`. |
| `page` | integer | no | `1` | 1 to 100000. |
| `per_page` | integer | no | `15` | 1 to 100. |

Any other `filter[...]` key is rejected with `422`. Empty filter values are ignored. The set of filters and sorts comes from a registry; see [Filters and sorting](filters-and-sorting.md).

Response `200`:

```json
{
  "data": [
    {
      "id": 1,
      "title": "Login redesign",
      "description": "New layout",
      "status": "pending",
      "risk": null,
      "submitter": { "id": 1, "name": "Alice Johnson" },
      "created_at": "2026-11-10T14:06:04+00:00",
      "updated_at": "2026-11-10T14:06:04+00:00",
      "latest_review": null
    }
  ],
  "links": {
    "first": "http://localhost:8000/api/items?page=1",
    "last": "http://localhost:8000/api/items?page=1",
    "prev": null,
    "next": null
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 1,
    "path": "http://localhost:8000/api/items",
    "per_page": 15,
    "to": 1,
    "total": 1,
    "links": [
      { "url": null, "label": "&laquo; Previous", "page": null, "active": false },
      { "url": "http://localhost:8000/api/items?page=1", "label": "1", "page": 1, "active": true },
      { "url": null, "label": "Next &raquo;", "page": null, "active": false }
    ]
  }
}
```

Errors: `401 unauthenticated`, `422 validation_failed`.

```bash
curl -G -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/items \
  --data-urlencode "state=pending" \
  --data-urlencode "filter[risk]=high" \
  --data-urlencode "sort=-updated_at" \
  --data-urlencode "per_page=10"
```

## GET /api/items/search

Case-insensitive substring search over title and description. Accepts every parameter of [GET /api/items](#get-apiitems) plus `q`; the response has the same shape.

| Name | Type | Required | Default | Validation |
| --- | --- | --- | --- | --- |
| `q` | string | no | none | Max 100 characters. Trimmed; a blank value behaves like the plain list. |

Search runs after the `state` scope and before filters and sorting.

Errors: `401 unauthenticated`, `422 validation_failed` (for example `q` longer than 100 characters).

```bash
curl -G -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/items/search \
  --data-urlencode "q=login" \
  --data-urlencode "state=all"
```

## GET /api/items/filters

Metadata describing the available filters and sorts. The UI builds its controls from this response. Note that this response is not wrapped in `data`.

- Auth: required.
- Parameters: none.

Response `200`:

```json
{
  "filters": [
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "options": [
        { "value": "pending", "label": "Pending" },
        { "value": "approved", "label": "Approved" },
        { "value": "rejected", "label": "Rejected" }
      ]
    },
    {
      "key": "risk",
      "label": "Risk",
      "type": "select",
      "options": [
        { "value": "low", "label": "Low" },
        { "value": "medium", "label": "Medium" },
        { "value": "high", "label": "High" },
        { "value": "none", "label": "None" }
      ]
    },
    {
      "key": "submitter",
      "label": "Submitter",
      "type": "select",
      "options": [
        { "value": "everyone", "label": "Everyone" },
        { "value": "mine", "label": "Mine" }
      ]
    },
    { "key": "created_from", "label": "Created from", "type": "date" },
    { "key": "created_to", "label": "Created to", "type": "date" }
  ],
  "sorts": [
    { "key": "created_at", "label": "Created" },
    { "key": "updated_at", "label": "Updated" },
    { "key": "title", "label": "Title" },
    { "key": "risk", "label": "Risk" }
  ]
}
```

A filter `type` is `select` (with `options`), `date` or `text`.

Errors: `401 unauthenticated`.

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/items/filters
```

## GET /api/items/{id}

One item with its submitter and latest review.

- Auth: required.
- Path parameter: `id`, a positive integer. A non-numeric id does not match the route and returns `404 not_found`.

Response `200`:

```json
{
  "data": {
    "id": 1,
    "title": "Login redesign",
    "description": "New layout",
    "status": "pending",
    "risk": null,
    "submitter": { "id": 1, "name": "Alice Johnson" },
    "created_at": "2026-11-10T14:06:04+00:00",
    "updated_at": "2026-11-10T14:06:04+00:00",
    "latest_review": null
  }
}
```

Errors: `401 unauthenticated`, `404 not_found` (`"Item not found."`).

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/items/1
```

## GET /api/items/{id}/reviews

Review history of an item, newest first.

- Auth: required.
- Path parameter: `id`, a positive integer.

| Name | Type | Required | Default | Validation |
| --- | --- | --- | --- | --- |
| `page` | integer | no | `1` | Minimum 1. |
| `per_page` | integer | no | `15` | 1 to 100. |

Response `200` (`links` and `meta` as in [GET /api/items](#get-apiitems)):

```json
{
  "data": [
    {
      "id": 1,
      "decision": "approved",
      "risk": "low",
      "note": "ok",
      "reviewer": { "id": 2, "name": "Bob Smith" },
      "created_at": "2026-11-10T14:20:41+00:00"
    }
  ],
  "links": { "first": "...", "last": "...", "prev": null, "next": null },
  "meta": { "current_page": 1, "from": 1, "last_page": 1, "per_page": 15, "to": 1, "total": 1 }
}
```

Errors: `401 unauthenticated`, `404 not_found`, `422 validation_failed`.

```bash
curl -G -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/items/1/reviews \
  --data-urlencode "per_page=5"
```

## POST /api/items

Submit a new item. It is created with status `pending` and the caller as submitter.

- Auth: required.

Body (JSON):

| Name | Type | Required | Default | Validation |
| --- | --- | --- | --- | --- |
| `title` | string | yes | none | Trimmed, 3 to 120 characters. |
| `description` | string | yes | none | Max 5000 characters. |

Response `201`:

```json
{
  "data": {
    "id": 2,
    "title": "Checkout flow",
    "description": "Add a coupon field",
    "status": "pending",
    "risk": null,
    "submitter": { "id": 1, "name": "Alice Johnson" },
    "created_at": "2026-11-10T15:00:00+00:00",
    "updated_at": "2026-11-10T15:00:00+00:00",
    "latest_review": null
  }
}
```

Errors: `401 unauthenticated`, `422 validation_failed`:

```json
{
  "message": "The given data was invalid.",
  "code": "validation_failed",
  "errors": {
    "title": ["The title field must be at least 3 characters."],
    "description": ["The description field is required."]
  }
}
```

```bash
curl -X POST http://localhost:8000/api/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"title":"Checkout flow","description":"Add a coupon field"}'
```

## POST /api/items/reviews

Review one or many items in a single request. The batch has partial-success semantics: items that cannot be reviewed are reported in `failed` while the rest are updated, all under one storage lock. The item detail page uses this endpoint with a single id.

- Auth: required.

Body (JSON):

| Name | Type | Required | Default | Validation |
| --- | --- | --- | --- | --- |
| `ids` | integer[] | yes | none | 1 to 100 entries, each an integer of at least 1. Duplicates are removed. |
| `decision` | string | yes | none | `approved` or `rejected`. |
| `risk` | string | no | `null` | `low`, `medium` or `high`. When omitted, an item keeps its existing risk. |
| `note` | string | no | `null` | Max 1000 characters. Trimmed; blank becomes `null`. |

Response `200` (even when some items fail):

```json
{
  "data": {
    "updated": [
      {
        "id": 1,
        "title": "Login redesign",
        "description": "New layout",
        "status": "approved",
        "risk": "low",
        "submitter": { "id": 1, "name": "Alice Johnson" },
        "created_at": "2026-11-10T14:06:04+00:00",
        "updated_at": "2026-11-10T14:20:41+00:00",
        "latest_review": {
          "id": 1,
          "decision": "approved",
          "risk": "low",
          "note": "ok",
          "reviewer": { "id": 2, "name": "Bob Smith" },
          "created_at": "2026-11-10T14:20:41+00:00"
        }
      }
    ],
    "failed": [{ "id": 99, "reason": "not_found" }]
  },
  "meta": { "updated_count": 1, "failed_count": 1 }
}
```

Failure reasons:

| `reason` | Meaning |
| --- | --- |
| `not_found` | No item with that id. |
| `already_reviewed` | The item is already approved or rejected; it is never reviewed twice. |

Errors: `401 unauthenticated`, `422 validation_failed` (bad `ids`, `decision`, `risk` or `note`).

```bash
curl -X POST http://localhost:8000/api/items/reviews \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"ids":[1,2,99],"decision":"approved","risk":"low","note":"ok"}'
```
