# Data model

The JSON files that hold all data, their fields and relations, and how writes stay safe.

## Contents

- [Files and location](#files-and-location)
- [Entity relationships](#entity-relationships)
- [Fields](#fields)
- [Enums](#enums)
- [Atomic writes and locking](#atomic-writes-and-locking)
- [Resetting data](#resetting-data)

## Files and location

Data lives in `backend/storage/app/data/` (override with `JSON_STORAGE_PATH`) as three files: `users.json`, `items.json` and `reviews.json`. Each file is a JSON list of records with integer ids. A missing or empty file is treated as an empty collection and is created on first write. A `<name>.lock` sidecar file is created next to each collection for locking.

## Entity relationships

```mermaid
erDiagram
    users ||--o{ items : "submitter_id"
    users ||--o{ reviews : "reviewer_id"
    items ||--o{ reviews : "item_id"
    users {
        int id PK
        string name
        datetime created_at
    }
    items {
        int id PK
        string title
        string description
        int submitter_id FK
        string status "pending|approved|rejected"
        string risk "low|medium|high|null"
        datetime created_at
        datetime updated_at
    }
    reviews {
        int id PK
        int item_id FK
        int reviewer_id FK
        string decision "approved|rejected"
        string risk "low|medium|high|null"
        string note "nullable"
        datetime created_at
    }
```

## Fields

`users.json`:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | integer | Auto-incremented. |
| `name` | string | The normalized name as typed the first time (2 to 60 characters). Unique by its case-insensitive key. |
| `created_at` | string | UTC ISO-8601. |

A user is just a name: there are no accounts, emails or passwords. Rows written by older versions may also carry an external-provider id and an `email` field; those fields are ignored when reading and are not written for new users. See [Identity and names](identity-and-names.md#old-data).

### Name normalization and find-or-create

Names are normalized before they are compared or stored: leading and trailing whitespace is removed and every run of whitespace becomes one space. The comparison key is that normalized name, lower-cased; accents are significant, so `Ana  Lopez` and `ana lopez` are the same person while `José` and `Jose` are not.

`UserRepository::findOrCreateByName` runs the whole lookup inside one `users` transaction (see [Atomic writes and locking](#atomic-writes-and-locking)): it scans the records for a matching key and returns that user, or inserts a new `{id, name, created_at}` with the normalized name. Because the lookup and the insert hold the same exclusive lock, concurrent requests with the same new name create exactly one user.

`items.json`:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | integer | Auto-incremented. |
| `title` | string | 3 to 120 characters. |
| `description` | string | Up to 5000 characters. |
| `submitter_id` | integer | References `users.id`; the person named when the item was submitted. |
| `status` | string | `pending`, `approved` or `rejected`. |
| `risk` | string or null | Set by a review. |
| `created_at`, `updated_at` | string | UTC ISO-8601. `updated_at` changes on review. |

`reviews.json`:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | integer | Auto-incremented. |
| `item_id` | integer | References `items.id`. |
| `reviewer_id` | integer | References `users.id`; the person named when the review was made. Never equal to the item's `submitter_id`. |
| `decision` | string | `approved` or `rejected`. |
| `risk` | string or null | The item's risk after the review. |
| `note` | string or null | Up to 1000 characters. |
| `created_at` | string | UTC ISO-8601. |

An item is reviewed at most once: a review moves it from `pending` to `approved` or `rejected`, and later attempts are reported as `already_reviewed`. A review whose reviewer is the item's submitter is reported as `same_person` and never written. The API presents `latest_review` and the review history from the `reviews` file.

## Enums

| Enum | Values | Notes |
| --- | --- | --- |
| `ItemStatus` | `pending`, `approved`, `rejected` | `approved` and `rejected` count as reviewed. |
| `ReviewDecision` | `approved`, `rejected` | Maps to the resulting item status. |
| `RiskLevel` | `low`, `medium`, `high` | Sort weight 1, 2, 3. A missing risk sorts last. |

## Atomic writes and locking

`app/Storage/JsonStore.php` guards every write:

1. Open the sidecar `<collection>.lock` file and take an exclusive `flock`. The data file itself cannot hold the lock because it is replaced by rename.
2. Read the current records fresh from disk (not from the per-request cache).
3. Run the mutation.
4. Write the result to a temporary file in the same directory, then `rename` it over the data file. Readers see either the old or the new file, never a partial one.
5. Release the lock.

Reads are cached per request, so each file is read at most once. Nested transactions on the same collection join the outer one, which is how a bulk review updates items and creates reviews under one lock. A corrupt file (invalid JSON or a non-list) raises a storage exception, is logged, and is returned as a generic `500 server_error`.

## Resetting data

```bash
cd backend
php artisan app:seed-json --fresh --count=50
```

`--fresh` deletes the three data files first, `--count=N` sets the number of items (default 50) and `--seed=N` makes the output deterministic. The seeder creates five demo people (Ana Lopez, Ben Carter, Chloe Nguyen, David Kim and Elena Rossi) through the same find-or-create step. Resetting is also the recommended fix for old `users.json` data from earlier versions.
