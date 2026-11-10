# Troubleshooting

Common problems and how to fix them.

## Contents

- [vendor/autoload.php is missing](#vendorautoloadphp-is-missing)
- [A port is already in use](#a-port-is-already-in-use)
- [401 from the API](#401-from-the-api)
- [CORS errors in the browser](#cors-errors-in-the-browser)
- [The app shows a configuration error](#the-app-shows-a-configuration-error)
- [Corrupt JSON data file](#corrupt-json-data-file)
- [Resetting data](#resetting-data)
- [E2E specs are skipped](#e2e-specs-are-skipped)

## vendor/autoload.php is missing

Symptom: PHP errors such as `Failed opening required '.../vendor/autoload.php'`. Dependencies are not installed (common in a fresh clone or worktree).

```bash
cd backend && composer install
cd ../frontend && pnpm install
```

Or run `make install`.

## A port is already in use

`make dev` uses ports 8000 (API) and 5173 (frontend); `make e2e` uses 8099 and 5199. Find and stop the process:

```bash
lsof -i :8000
kill <pid>
```

For E2E, set `E2E_BACKEND_PORT` and `E2E_FRONTEND_PORT` instead. If you change the dev frontend port, also add the new origin to `CLERK_AUTHORIZED_PARTIES` and `CORS_ALLOWED_ORIGINS` in `backend/.env`.

## 401 from the API

Every `401` has `code: "unauthenticated"`; check the cause in this order:

1. **Database drivers in an old `.env`.** The backend needs no database and `.env.example` sets `CACHE_STORE=file`, `SESSION_DRIVER=array` and `QUEUE_CONNECTION=sync`. If your `backend/.env` was created before that and still has `database` for these, the JWKS cache fails and every request returns `401` under `make dev`. Change the three values to the ones above and restart.
2. **Authorized parties.** The token's `azp` must be listed in `CLERK_AUTHORIZED_PARTIES` (comma-separated, exact origin including port, for example `http://localhost:5173`).
3. **Issuer.** `CLERK_ISSUER` must equal the token's `iss`, which is your Clerk Frontend API URL with no trailing slash.
4. **JWKS URL.** `CLERK_JWKS_URL` must be reachable from the backend. Failures are logged as `Unable to load Clerk JWKS` in `backend/storage/logs/laravel.log`.
5. **Expired session.** Sign in again; the UI redirects to `/sign-in` automatically.

After changing `.env`, restart `make dev`. To clear a cached JWKS: `cd backend && php artisan cache:clear`.

## CORS errors in the browser

The browser console shows a blocked cross-origin request. `CORS_ALLOWED_ORIGINS` in `backend/.env` must contain the exact frontend origin (scheme, host and port), for example `http://localhost:5173`. Also check that `VITE_API_BASE_URL` in `frontend/.env` points at the running API (`http://localhost:8000/api`). Restart both servers after changing either file.

## The app shows a configuration error

`VITE_CLERK_PUBLISHABLE_KEY is not set`: add your publishable key to `frontend/.env` and restart the Vite server.

## Corrupt JSON data file

Symptom: the API returns `500 server_error` for item endpoints, and `backend/storage/logs/laravel.log` contains `Corrupted JSON storage file` or `Unexpected JSON storage structure` with the file path. A data file is not valid JSON or is not a list (for example after a hand edit or a killed process outside the normal atomic write).

Options:

- Fix the file by hand: each of `users.json`, `items.json` and `reviews.json` must be a JSON list (`[]` is valid; an empty file also works).
- Or delete the file, or reset everything as described below.

## Resetting data

```bash
cd backend
php artisan app:seed-json --fresh --count=50
```

`--fresh` deletes `users.json`, `items.json` and `reviews.json` in the storage directory before seeding. Add `--seed=1` for repeatable data. To start empty, delete the three files in `backend/storage/app/data` (or in `JSON_STORAGE_PATH`).

## E2E specs are skipped

The setup project skips Clerk-dependent specs and names the missing variables, for example `E2E_CLERK_USER_USERNAME`, `CLERK_PUBLISHABLE_KEY` (taken from `VITE_CLERK_PUBLISHABLE_KEY`) or `CLERK_SECRET_KEY`. Set them as described in [Testing](testing.md).
