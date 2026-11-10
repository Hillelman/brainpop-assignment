# Testing

The test layers, how to run each one, the helpers available and how to debug a failing end-to-end run.

## Contents

- [Test layers](#test-layers)
- [Running tests](#running-tests)
- [Backend test helpers](#backend-test-helpers)
- [End-to-end tests](#end-to-end-tests)
- [Debugging a failing E2E run](#debugging-a-failing-e2e-run)

## Test layers

| Layer | Tool | Location | Covers |
| --- | --- | --- | --- |
| Backend unit | Pest | `backend/tests/Unit` | JSON store, repositories, entities, name normalization (`PersonName`), query pipeline, review service. |
| Backend feature | Pest | `backend/tests/Feature` | HTTP endpoints (all open, no auth headers), the error contract, name validation and `same_person`, sorts, pagination bounds, the `.env` script, running without a database. |
| Frontend unit and component | Vitest + jsdom | `frontend/src/**/__tests__`, `frontend/src/App.test.ts` | API client, composables, components, views, router guard, helpers. |
| End to end | Playwright | `frontend/e2e` | Real browser against a real backend: smoke, submit, queue search, filter and sort, bulk review, self-review, item detail, error states. |

## Running tests

| Command | What it runs |
| --- | --- |
| `make test` | Backend Pest tests, then frontend Vitest tests. |
| `make e2e` | The Playwright suite. |
| `make lint` | Pint (check only) and ESLint. |
| `make format` | Pint and Prettier (writes files). |
| `make typecheck` | `vue-tsc` for the frontend. |

Targeted runs:

```bash
cd backend
php artisan test --filter=BulkReview      # by name
php artisan test tests/Unit               # one directory

cd ../frontend
pnpm test -- src/composables              # Vitest, path filter
pnpm exec playwright test e2e/specs/submit.spec.ts
```

## Backend test helpers

Located in `backend/tests/Support`. Use them with `uses(...)` at the top of a Pest file.

| Helper | What it does |
| --- | --- |
| `UsesTempJsonStorage` | Points `storage_json.path` at a fresh temp directory for each test and deletes it afterwards, so tests never touch real data. |

Nothing else is needed: the API has no authentication, so feature tests call endpoints directly with `getJson` / `postJson` and no headers. Pass names in the body (`submitter_name`, `reviewer_name`) or create people with `app(UserRepository::class)->findOrCreateByName('Ana Lopez')`.

Example:

```php
uses(UsesTempJsonStorage::class);

it('rejects reviewing your own item', function () {
    $ana = app(UserRepository::class)->findOrCreateByName('Ana Lopez');
    $item = app(ItemRepository::class)->create(['title' => 'Login', 'description' => 'd', 'submitter_id' => $ana->id]);

    $this->postJson('/api/items/reviews', ['ids' => [$item->id], 'decision' => 'approved', 'reviewer_name' => ' ana  lopez '])
        ->assertOk()
        ->assertJsonPath('data.failed.0.reason', 'same_person');
});
```

## End-to-end tests

`make e2e` starts its own backend on port `8099` and frontend on port `5199`, uses an isolated temp data directory, seeds 30 items with `app:seed-json --fresh --count=30` and runs the specs in `frontend/e2e/specs`. There is no sign-in, and the suite needs no keys or environment variables: the E2E backend gets a throwaway `APP_KEY`, so it runs even without `backend/.env`.

Prerequisites:

- Chromium for Playwright (installed by `make install`, or `cd frontend && pnpm exec playwright install chromium`).
- Free ports `8099` and `5199`, or set `E2E_FRONTEND_PORT` and `E2E_BACKEND_PORT` (see [Configuration](configuration.md)).

Specs type names themselves (page objects in `frontend/e2e/pages` fill **Your name** and **Reviewer name**) and use unique names and titles per run, so they do not depend on each other. `self-review.spec.ts` covers the self-review rule on the detail page and in the bulk bar.

The E2E backend server overrides `JSON_STORAGE_PATH`, `CORS_ALLOWED_ORIGINS`, `CACHE_STORE` and `APP_KEY` for the E2E ports.

## Debugging a failing E2E run

- The HTML report is written to `frontend/playwright-report`. Open it with `pnpm exec playwright show-report`.
- Traces are recorded on the first retry (`CI` sets one retry). To record one locally, run `pnpm exec playwright test --trace on`, then open it:

  ```bash
  cd frontend
  pnpm exec playwright show-trace test-results/<test-folder>/trace.zip
  ```

  The trace viewer shows each action, the DOM snapshot, network calls and console output.
- Watch the browser with `pnpm exec playwright test --headed`, or step through with `--debug`.
- A `503` from the E2E backend would mean its `APP_KEY` is missing; see [Troubleshooting](troubleshooting.md).
- E2E ports in use: stop the other process or set `E2E_FRONTEND_PORT` and `E2E_BACKEND_PORT`. The runner does not reuse existing servers.
