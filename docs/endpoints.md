# Endpoints

Reference for every HTTP endpoint of the Review Queue API.

## Contents

- [Conventions](#conventions)
- [GET /api/health](#get-apihealth)
- [GET /api/items](#get-apiitems)
- [GET /api/items/search](#get-apiitemssearch)
- [GET /api/items/filters](#get-apiitemsfilters)
- [GET /api/items/{id}](#get-apiitemsid)
- [GET /api/items/{id}/reviews](#get-apiitemsidreviews)
- [POST /api/items](#post-apiitems)
- [POST /api/items/reviews](#post-apiitemsreviews)

## Conventions

- Base URL in development: `http://localhost:8000/api`.
- No endpoint needs an `Authorization` header or any key. People are identified by the `submitter_name` and `reviewer_name` they send; see [Identity and names](identity-and-names.md).
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

Liveness and storage check. Always `200`; it reports booleans only.

- Parameters: none.

Response `200`:

```json
{ "status": "ok", "checks": { "storage_writable": true } }
```

`storage_writable` is `false` when the JSON storage directory (or the nearest existing parent) is not writable.

```bash
curl http://localhost:8000/api/health
```

## GET /api/items

Paginated item list with state scope, filters and sorting.

Query parameters:

| Name | Type | Required | Default | Validation |
| --- | --- | --- | --- | --- |
| `state` | string | no | `all` | API-only; the UI does not send it. One of `pending`, `reviewed`, `all`. `pending` means not yet reviewed, `reviewed` means approved or rejected. The UI narrows by `filter[status]` instead. |
| `filter[status]` | string | no | none | `pending`, `approved` or `rejected`. |
| `filter[risk]` | string | no | none | `low`, `medium`, `high` or `none` (items without a risk). |
| `filter[submitter]` | string | no | none | The id of a user who has submitted at least one item, as listed in the `options` of `/api/items/filters`. Any other value is rejected with `422`. |
| `filter[created_from]` | date | no | none | `YYYY-MM-DD`, inclusive from the start of that UTC day. |
| `filter[created_to]` | date | no | none | `YYYY-MM-DD`, inclusive to the end of that UTC day; must not be earlier than `filter[created_from]`. |
| `filter[reviewed_from]` | date | no | none | `YYYY-MM-DD`, inclusive from the start of that UTC day, compared with the date of the item's latest review. Items that have not been reviewed are excluded whenever this is set. |
| `filter[reviewed_to]` | date | no | none | `YYYY-MM-DD`, inclusive to the end of that UTC day, compared with the latest review date; must not be earlier than `filter[reviewed_from]`. Unreviewed items are excluded whenever this is set. |
| `sort` | string | no | `-created_at` | One of `created_at`, `updated_at`, `title`, `risk`, `status`, `submitter`; prefix with `-` for descending. `status` orders pending, approved, rejected; `submitter` orders by name, case-insensitive. Items with no risk always sort last. Ties break on `id`. |
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

Errors: `422 validation_failed`.

```bash
curl -G http://localhost:8000/api/items \
  --data-urlencode "filter[status]=pending" \
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

Errors: `422 validation_failed` (for example `q` longer than 100 characters).

```bash
curl -G http://localhost:8000/api/items/search \
  --data-urlencode "q=login" \
  --data-urlencode "sort=-title"
```

## GET /api/items/filters

Metadata describing the available filters and sorts. The UI builds its controls from this response. Note that this response is not wrapped in `data`.

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
        { "value": "1", "label": "Ana Lopez" },
        { "value": "2", "label": "Ben Carter" }
      ]
    },
    { "key": "created_from", "label": "From", "type": "date", "group": "created_at", "group_label": "Created at" },
    { "key": "created_to", "label": "To", "type": "date", "group": "created_at", "group_label": "Created at" },
    { "key": "reviewed_from", "label": "From", "type": "date", "group": "reviewed_at", "group_label": "Reviewed at" },
    { "key": "reviewed_to", "label": "To", "type": "date", "group": "reviewed_at", "group_label": "Reviewed at" }
  ],
  "sorts": [
    { "key": "created_at", "label": "Created" },
    { "key": "updated_at", "label": "Updated" },
    { "key": "title", "label": "Title" },
    { "key": "risk", "label": "Risk" },
    { "key": "status", "label": "Status" },
    { "key": "submitter", "label": "Submitter" }
  ]
}
```

A filter `type` is `select` (with `options`), `date` or `text`. The `submitter` options are the people who have submitted at least one item, sorted by name, with the user id as the value; the list changes as new people submit, and the queue UI refetches it each time you return to the queue.

A filter may also carry `group` (a stable key) and `group_label` (the heading shown to people). Filters that share a `group` are laid out together as one labelled row; the label of each member is then short, such as `From` and `To`. Both fields are optional and are omitted for ungrouped filters.

```bash
curl http://localhost:8000/api/items/filters
```

## GET /api/items/{id}

One item with its submitter and latest review.

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

Errors: `404 not_found` (`"Item not found."`).

```bash
curl http://localhost:8000/api/items/1
```

## GET /api/items/{id}/reviews

Review history of an item, newest first.

- Path parameter: `id`, a positive integer.

| Name | Type | Required | Default | Validation |
| --- | --- | --- | --- | --- |
| `page` | integer | no | `1` | 1 to 100000 (max 100000). Larger values return `422`. |
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

Errors: `404 not_found`, `422 validation_failed`.

```bash
curl -G http://localhost:8000/api/items/1/reviews \
  --data-urlencode "per_page=5"
```

## POST /api/items

Submit a new item. It is created with status `pending`, and the person named in `submitter_name` is its submitter (created on first sight).

Body (JSON):

| Name | Type | Required | Default | Validation |
| --- | --- | --- | --- | --- |
| `title` | string | yes | none | Trimmed, 3 to 120 characters. |
| `description` | string | yes | none | Max 5000 characters. |
| `submitter_name` | string | yes | none | The submitter's name. Whitespace is trimmed and collapsed; 2 to 60 characters after that. Matched to existing people case-insensitively, with accents significant. See [Identity and names](identity-and-names.md). |

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

Errors: `422 validation_failed`:

```json
{
  "message": "The given data was invalid.",
  "code": "validation_failed",
  "errors": {
    "title": ["The title field must be at least 3 characters."],
    "description": ["The description field is required."],
    "submitter_name": ["The submitter name must be between 2 and 60 characters."]
  }
}
```

```bash
curl -X POST http://localhost:8000/api/items \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"title":"Checkout flow","description":"Add a coupon field","submitter_name":"Ana Lopez"}'
```

## POST /api/items/reviews

Review one or many items in a single request. The batch has partial-success semantics: items that cannot be reviewed are reported in `failed` while the rest are updated, all under one storage lock. The item detail page uses this endpoint with a single id.

Body (JSON):

| Name | Type | Required | Default | Validation |
| --- | --- | --- | --- | --- |
| `ids` | integer[] | yes | none | 1 to 100 entries, each an integer of at least 1. Duplicates are removed. |
| `decision` | string | yes | none | `approved` or `rejected`. |
| `risk` | string | no | `null` | `low`, `medium` or `high`. When omitted, an item keeps its existing risk. |
| `note` | string | no | `null` | Max 1000 characters. Trimmed; blank becomes `null`. |
| `reviewer_name` | string | yes | none | The reviewer's name. Whitespace is trimmed and collapsed; 2 to 60 characters after that. See [Identity and names](identity-and-names.md). |

A person cannot review an item they submitted: the reviewer name is matched to the submitter the same way as in `POST /api/items`.

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
| `same_person` | The reviewer is the item's submitter. The item stays pending. |

If every item fails, the response is still `200` with an empty `updated` array and every id in `failed`.

Errors: `422 validation_failed` (bad `ids`, `decision`, `risk`, `note` or `reviewer_name`).

```bash
curl -X POST http://localhost:8000/api/items/reviews \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"ids":[1,2,99],"decision":"approved","risk":"low","note":"ok","reviewer_name":"Ben Carter"}'
```
