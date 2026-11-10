# Review Queue

Review Queue is a small full-stack app where people submit items to a review queue and review them, one at a time or in bulk: approve or reject, assign a risk level and add an optional note. Submitters and reviewers are identified only by the name they type (see [Identity and names](docs/identity-and-names.md)). The backend is a Laravel REST API that stores its data in plain JSON files (no database), and the frontend is a Vue 3 single-page app.

<img width="1164" height="668" alt="Screenshot 2026-11-10 at 19 56 34" src="https://github.com/user-attachments/assets/c0e875c2-73e7-42b6-9f15-1029dc65c417" />


## Tech stack

| Area | Technology |
| --- | --- |
| Backend | PHP 8.4+, Laravel, Pest, Pint, JSON file storage |
| Frontend | Vue 3, Vite, TypeScript, Pinia, Vue Router, Tailwind CSS, shadcn-vue |
| Identity | Typed names, no authentication (see [Identity and names](docs/identity-and-names.md)) |
| Tests | Pest (backend), Vitest (frontend), Playwright (end to end) |

## Prerequisites

- PHP 8.4+ and Composer: `brew install php composer`
- Node.js 20.19+ and [pnpm](https://pnpm.io)

No accounts, API keys or environment variables are needed.

## Install and run

```bash
make install
make dev
```

`make install` installs Composer and pnpm dependencies, creates `backend/.env` from `backend/.env.example` when it is missing and generates an `APP_KEY` only when it is empty (an existing key is never overwritten), creates `frontend/.env` when missing, seeds demo data when there is none and installs the Playwright Chromium browser. `make dev` runs the same `.env` and key check, seeds demo data when there is none, and starts both servers. The path from a fresh clone is just `make install` then `make dev`, with no keys and no manual `.env` editing. Real `.env` files are git-ignored and must never be committed. See [Configuration](docs/configuration.md).

The equivalent manual steps:

```bash
sh scripts/ensure-backend-env.sh

cd backend
composer install
php artisan app:seed-json --if-empty

cd ../frontend
pnpm install
cp .env.example .env
```

To reset the demo data (about 50 items in mixed states), which is also the recommended fix for old data from earlier versions:

```bash
php backend/artisan app:seed-json --fresh
```

| Service | URL |
| --- | --- |
| Frontend (Vite) | http://localhost:5173 |
| Backend API | http://localhost:8000/api |
| Health check | http://localhost:8000/api/health |

## Test

```bash
make test   # backend Pest tests, then frontend Vitest tests
make e2e    # Playwright end-to-end suite (no keys or sign-in needed)
```

Other shortcuts: `make lint`, `make format`, `make typecheck`. See [Testing](docs/testing.md) for details.

## Project structure

```text
backend/
  app/          Console, Domain, DTOs, Enums, Exceptions, Http, Models,
                Providers, Queries, Repositories, Services, Storage, Support
  bootstrap/    Application bootstrap and the JSON error contract (app.php)
  config/       Laravel config, item_query.php, storage_json.php
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

- [User guide](docs/user-guide.md): submitting, the queue and sorting, bulk review and the item page.

### API

- [Endpoints](docs/endpoints.md): every endpoint with parameters, responses and `curl` examples.
- [Errors](docs/errors.md): the error contract, status and code table, and how the UI shows each.
- [Filters and sorting](docs/filters-and-sorting.md): the registry, current filters and sorts, and how to add your own.

### Architecture

- [Architecture](docs/architecture.md): backend and frontend layers and the request flow.
- [Data model](docs/data-model.md): JSON files, fields, enums, atomic writes and locking.
- [Identity and names](docs/identity-and-names.md): how typed names identify people, normalization, the self-review rule and the security note.

### Development

- [Configuration](docs/configuration.md): every environment variable and where it goes.
- [Testing](docs/testing.md): test layers, helpers, how the E2E suite runs and debugging.
- [Troubleshooting](docs/troubleshooting.md): common problems and fixes.
