# Review Queue

Review Queue is a small full-stack app where signed-in users submit items to a review queue and review them, one at a time or in bulk: approve or reject, assign a risk level and add an optional note. The backend is a Laravel REST API that stores its data in plain JSON files (no database), the frontend is a Vue 3 single-page app, and sign-in is handled by [Clerk](https://clerk.com).

Features:

- Sign in with Clerk; every API call is authenticated with the session token.
- Submit items (title and description) to the queue.
- Queue view with Pending / Reviewed / All tabs, search, filters, sorting and pagination, all kept in the URL so views are shareable.
- Bulk approve or reject with an optional risk level and note, with clear partial-failure reporting.
- Item detail page with the full review history and a copyable link.
- Pluggable filters and sorts: add one with a class and a config line.

## Tech stack

| Area | Technology |
| --- | --- |
| Backend | PHP 8.4+, Laravel, Pest, Pint, JSON file storage |
| Frontend | Vue 3, Vite, TypeScript, Pinia, Vue Router, Tailwind CSS, shadcn-vue |
| Auth | Clerk (`@clerk/vue` in the SPA, JWKS verification in the API) |
| Tests | Pest (backend), Vitest (frontend), Playwright (end to end) |

## Prerequisites

- PHP 8.4+ and Composer: `brew install php composer`
- Node.js 20.19+ and [pnpm](https://pnpm.io)
- A Clerk development instance and one test user (see [Authentication](docs/authentication.md)). The E2E suite signs in as that user.

## Install

```bash
make install
```

This installs Composer and pnpm dependencies, copies the `.env.example` files to `backend/.env` and `frontend/.env` when they do not exist, runs `php artisan key:generate` and installs the Playwright Chromium browser. The equivalent manual steps:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate

cd ../frontend
pnpm install
cp .env.example .env
```

Then fill in the Clerk values in `backend/.env` and `frontend/.env` (see [Configuration](docs/configuration.md)). Real `.env` files are git-ignored and must never be committed.

Optionally load demo data (about 50 items in mixed states):

```bash
cd backend
php artisan app:seed-json
```

## Run

```bash
make dev
```

| Service | URL |
| --- | --- |
| Frontend (Vite) | http://localhost:5173 |
| Backend API | http://localhost:8000/api |
| Health check | http://localhost:8000/api/health |

## Test

```bash
make test   # backend Pest tests, then frontend Vitest tests
make e2e    # Playwright end-to-end suite (needs Clerk variables)
```

Other shortcuts: `make lint`, `make format`, `make typecheck`. See [Testing](docs/testing.md) for details.

## Project structure

```text
backend/
  app/          Auth, Console, Domain, DTOs, Enums, Exceptions, Http, Models,
                Providers, Queries, Repositories, Services, Storage
  bootstrap/    Application bootstrap and the JSON error contract (app.php)
  config/       Laravel config, clerk.php, item_query.php, storage_json.php
  routes/       api.php and api/items.php
  storage/      JSON data files live in storage/app/data
  tests/        Feature, Unit, Support
frontend/
  e2e/          Playwright fixtures, page objects, specs, support
  public/       Static assets
  src/          api, components, composables, lib, router, stores, types, views
```

## Documentation

### Using the app

- [User guide](docs/user-guide.md): signing in, submitting, the queue, bulk review and the item page.

### API

- [Endpoints](docs/endpoints.md): every endpoint with parameters, responses and `curl` examples.
- [Errors](docs/errors.md): the error contract, status and code table, and how the UI shows each.
- [Authentication](docs/authentication.md): Clerk setup and how tokens are verified and attached.
- [Filters and sorting](docs/filters-and-sorting.md): the registry, current filters and sorts, and how to add your own.

### Architecture

- [Architecture](docs/architecture.md): backend and frontend layers and the request flow.
- [Data model](docs/data-model.md): JSON files, fields, enums, atomic writes and locking.

### Development

- [Configuration](docs/configuration.md): every environment variable and where it goes.
- [Testing](docs/testing.md): test layers, helpers, E2E prerequisites and debugging.
- [Troubleshooting](docs/troubleshooting.md): common problems and fixes.
