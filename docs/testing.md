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
| Backend unit | Pest | `backend/tests/Unit` | JSON store, repositories, entities, query pipeline, review service, Clerk token verifier. |
| Backend feature | Pest | `backend/tests/Feature` | HTTP endpoints, the error contract, pagination bounds, running without a database. |
| Frontend unit and component | Vitest + jsdom | `frontend/src/**/__tests__`, `frontend/src/App.test.ts` | API client, composables, components, views, router guard, helpers. |
| End to end | Playwright | `frontend/e2e` | Real browser against a real backend: smoke, submit, queue search, filter and sort, bulk review, item detail, error states. |

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
| `ActsAsClerkUser` | Provides `actingAsClerk($clerkId = 'user_test', $email = null)`, which binds `FakeTokenVerifier` and sets the `Authorization` header. |
| `FakeTokenVerifier` | A `TokenVerifier` that accepts tokens shaped `test-token:<clerkId>:<email>` so tests need no network or Clerk keys. |

Example:

```php
uses(ActsAsClerkUser::class, UsesTempJsonStorage::class);

it('returns the current user', function () {
    $this->actingAsClerk('user_1', 'a@x.io')->getJson('/api/me')
        ->assertOk()
        ->assertJsonPath('data.email', 'a@x.io');
});
```

## End-to-end tests

`make e2e` starts its own backend on port `8099` and frontend on port `5199`, uses an isolated temp data directory, seeds 30 items with `app:seed-json --fresh --count=30`, signs in once as the Clerk test user and runs the specs in `frontend/e2e/specs`.

Prerequisites:

- Chromium for Playwright (installed by `make install`, or `cd frontend && pnpm exec playwright install chromium`).
- A Clerk development instance with a test user (see [Authentication](authentication.md)).
- These variables (see [Configuration](configuration.md)):

  | Variable | Where it can live |
  | --- | --- |
  | `VITE_CLERK_PUBLISHABLE_KEY` | `frontend/.env` or `frontend/.env.local` |
  | `E2E_CLERK_USER_USERNAME` | `frontend/.env` or `frontend/.env.local` |
  | `CLERK_SECRET_KEY` | the shell, or `backend/.env` (read automatically when unset) |
  | `CLERK_JWKS_URL`, `CLERK_ISSUER` | `backend/.env` |

How sign-in works: the setup project calls `@clerk/testing` `clerk.signIn` with the user's email, which uses a Clerk sign-in token created with `CLERK_SECRET_KEY`. It does not depend on the user's password. The signed-in state is saved to `frontend/.auth/user.json` and reused by all specs.

The E2E backend server overrides `JSON_STORAGE_PATH`, `CORS_ALLOWED_ORIGINS`, `CLERK_AUTHORIZED_PARTIES` and `CACHE_STORE` for the E2E ports. The ports can be changed with `E2E_FRONTEND_PORT` and `E2E_BACKEND_PORT`.

If the Clerk variables are missing, the Clerk-dependent specs are skipped with a message naming the missing variables and `make e2e` still succeeds.

## Debugging a failing E2E run

- The HTML report is written to `frontend/playwright-report`. Open it with `pnpm exec playwright show-report`.
- Traces are recorded on the first retry (`CI` sets one retry). To record one locally, run `pnpm exec playwright test --trace on`, then open it:

  ```bash
  cd frontend
  pnpm exec playwright show-trace test-results/<test-folder>/trace.zip
  ```

  The trace viewer shows each action, the DOM snapshot, network calls and console output.
- Watch the browser with `pnpm exec playwright test --headed`, or step through with `--debug`.
- A 401 after sign-in usually means `CLERK_ISSUER` or `CLERK_JWKS_URL` in `backend/.env` is wrong; see [Troubleshooting](troubleshooting.md).
- E2E ports in use: stop the other process or set `E2E_FRONTEND_PORT` and `E2E_BACKEND_PORT`. The runner does not reuse existing servers.
