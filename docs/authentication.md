# Authentication

How sign-in works: Clerk setup, backend token verification and how the frontend attaches tokens.

## Contents

- [Overview](#overview)
- [Clerk setup step by step](#clerk-setup-step-by-step)
- [How the backend verifies tokens](#how-the-backend-verifies-tokens)
- [How the frontend attaches tokens](#how-the-frontend-attaches-tokens)
- [Sign-in redirects](#sign-in-redirects)

## Overview

Users sign in through Clerk in the browser. Clerk issues a short-lived session JWT. The SPA sends it as `Authorization: Bearer <jwt>` and the API verifies it against Clerk's public keys (JWKS). There are no passwords or sessions in the API.

## Clerk setup step by step

1. Create an account at [clerk.com](https://clerk.com) and create an application (a development instance is fine).
2. In the Clerk dashboard open **API keys**. Copy the **Publishable key** (`pk_test_xxx`) and the **Secret key** (`sk_test_xxx`).
3. Find your **Frontend API URL**, for example `https://your-instance.clerk.accounts.dev`. This is the token issuer.
4. The JWKS URL is the Frontend API URL plus `/.well-known/jwks.json`. It is also listed under **API keys** then **Show JWT public key**.
5. Make the session token carry the user's name and email. Under **Sessions** then **Customize session token**, set the claims:

   ```json
   {
     "email": "{{user.primary_email_address}}",
     "name": "{{user.full_name}}"
   }
   ```

   Without them the API still works, but `/api/me` returns an empty email and uses the Clerk user id as the display name.
6. Decide the authorized parties: the origins that may use tokens. For development that is `http://localhost:5173`. For the E2E suite add `http://localhost:5199` (the E2E runner overrides the variable for its own backend, but list it if you reuse one backend).
7. Create a test user: under **Users** choose **Create user** and give it an email address. Its email is `E2E_CLERK_USER_USERNAME` for the E2E suite.
8. Put the values in the env files (placeholders shown):

   ```bash
   # backend/.env
   CLERK_SECRET_KEY=sk_test_xxx
   CLERK_JWKS_URL=https://your-instance.clerk.accounts.dev/.well-known/jwks.json
   CLERK_ISSUER=https://your-instance.clerk.accounts.dev
   CLERK_AUTHORIZED_PARTIES=http://localhost:5173,http://localhost:5199

   # frontend/.env
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
   E2E_CLERK_USER_USERNAME=test.user@example.com
   ```

See [Configuration](configuration.md) for every variable.

## How the backend verifies tokens

The `auth.clerk` middleware (`app/Http/Middleware/AuthenticateWithClerk.php`) guards every route except `/api/health`. Verification lives in `app/Auth/ClerkJwksTokenVerifier.php`:

1. Read the bearer token; none gives `401 unauthenticated`.
2. Load the JWKS from `CLERK_JWKS_URL` (5 second timeout) and cache it for one hour in the cache store. The cache store is `file` by default; see [Troubleshooting](troubleshooting.md) if you copied an older `.env`.
3. Decode and verify the RS256 signature and the standard time claims (`exp`, `nbf`). Failures give `401`.
4. If `CLERK_ISSUER` is set, the `iss` claim must match exactly.
5. If `CLERK_AUTHORIZED_PARTIES` is non-empty, the `azp` claim must be one of the listed origins.
6. The `sub` claim must be present; it becomes the Clerk id.
7. The user is looked up by Clerk id and created on first sight (`name` and `email` come from the claims), then set as the request user.

Any failure returns `401` with `{ "message", "code": "unauthenticated" }`.

## How the frontend attaches tokens

- `src/main.ts` installs the Clerk plugin with `VITE_CLERK_PUBLISHABLE_KEY` and registers `setTokenProvider(() => auth.getToken.value())`.
- `src/api/http.ts` calls the token provider before each request and sets the `Authorization` header when a token exists.
- A `401` response calls the unauthorized handler, which sends the user to `/sign-in?redirect=<current path>`.
- The router guard (`src/router/index.ts`) waits for Clerk to load, then redirects signed-out users to `/sign-in`; only the sign-in route is public.
- Without `VITE_CLERK_PUBLISHABLE_KEY`, the app renders a configuration error instead of starting.

## Sign-in redirects

The `redirect` query parameter is passed through `safeRedirect` (`src/lib/safeRedirect.ts`). Only same-origin paths starting with a single `/` are honored. Absolute URLs, protocol-relative `//host` paths, backslashes and control characters fall back to `/items`.
