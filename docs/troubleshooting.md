# Troubleshooting

Common problems and how to fix them.

## Contents

- [vendor/autoload.php is missing](#vendorautoloadphp-is-missing)
- [A port is already in use](#a-port-is-already-in-use)
- [Reviewing says "You can't review an item you submitted"](#reviewing-says-you-cant-review-an-item-you-submitted)
- [Name validation errors](#name-validation-errors)
- [Old data from earlier versions](#old-data-from-earlier-versions)
- [CORS errors in the browser](#cors-errors-in-the-browser)
- [Corrupt JSON data file](#corrupt-json-data-file)
- [Resetting data](#resetting-data)
- [E2E problems](#e2e-problems)

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

The API only accepts browser requests from `http://localhost:5173`, so keep the dev frontend on that port.

## Reviewing says "You can't review an item you submitted"

The reviewer name matches the item's submitter after trimming, collapsing spaces and ignoring case, so `Ana Lopez`, ` ana  lopez ` and `ANA LOPEZ` are all the same person. On the item page the button is disabled; in the bulk bar an inline error names the items you submitted and **Approve** and **Reject** stay disabled (the API itself reports `same_person`). Have someone else review it, or type that person's name. Accents count: `José` and `Jose` are different people. See [Identity and names](identity-and-names.md#the-self-review-rule).

## Name validation errors

`submitter_name` and `reviewer_name` must be 2 to 60 characters after trimming and collapsing whitespace. A blank or whitespace-only name, a single character or a name over 60 characters is rejected with `422 validation_failed` on that field, for example `The reviewer name must be between 2 and 60 characters.` In the UI the message appears under **Your name** or **Reviewer name**, with a character counter. Fix the name and try again. See [Errors](errors.md).

## Old data from earlier versions

`users.json` files written by earlier versions carry extra identity fields. They still load, and the extra fields are ignored. Old names may not follow the current normalization rules, so the same person can show up twice. To start clean, reseed (this deletes all items, reviews and users):

```bash
php backend/artisan app:seed-json --fresh
```

## CORS errors in the browser

The browser console shows a blocked cross-origin request. The API allows the frontend origin `http://localhost:5173` by default, so open the app on exactly that address (not `127.0.0.1`) and keep the API on `http://localhost:8000/api`.

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

`--fresh` deletes `users.json`, `items.json` and `reviews.json` in the storage directory before seeding. Add `--seed=1` for repeatable data. `make dev` and `make install` run `php artisan app:seed-json --if-empty` first, which seeds only when `items.json` is missing or an empty list and never overwrites existing data. To start empty, delete the three files in `backend/storage/app/data`.

## E2E problems

If `make e2e` fails to start, the usual cause is a busy port (8099 or 5199): stop the other process. The runner does not reuse existing servers. For debugging tips see [Testing](testing.md#debugging-a-failing-e2e-run).
