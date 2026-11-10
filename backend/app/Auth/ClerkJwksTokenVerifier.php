<?php

namespace App\Auth;

use App\Auth\Contracts\TokenVerifier;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class ClerkJwksTokenVerifier implements TokenVerifier
{
    private const JWKS_CACHE_KEY = 'clerk.jwks';

    private const JWKS_TTL_SECONDS = 3600;

    public function verify(string $jwt): ClerkClaims
    {
        $keys = $this->keys();

        try {
            $payload = (array) JWT::decode($jwt, $keys);
        } catch (Throwable $e) {
            throw new AuthenticationException('Invalid token.');
        }

        $issuer = config('clerk.issuer');
        if (is_string($issuer) && $issuer !== '' && ($payload['iss'] ?? null) !== $issuer) {
            throw new AuthenticationException('Invalid token issuer.');
        }

        /** @var list<string> $parties */
        $parties = (array) config('clerk.authorized_parties', []);
        if ($parties !== [] && ! in_array($payload['azp'] ?? null, $parties, true)) {
            throw new AuthenticationException('Unauthorized party.');
        }

        $sub = $payload['sub'] ?? null;
        if (! is_string($sub) || $sub === '') {
            throw new AuthenticationException('Token has no subject.');
        }

        $email = $payload['email'] ?? '';
        $name = $payload['name'] ?? '';

        return new ClerkClaims(
            sub: $sub,
            email: is_string($email) ? $email : '',
            name: is_string($name) && $name !== '' ? $name : $sub,
        );
    }

    /**
     * @return array<string, Key>
     */
    private function keys(): array
    {
        try {
            return JWK::parseKeySet($this->jwks(), 'RS256');
        } catch (Throwable $e) {
            Log::error('Unable to load Clerk JWKS.', ['exception_class' => $e::class]);

            throw new AuthenticationException('Unable to verify token.');
        }
    }

    /**
     * Reads the JWKS through the cache, falling back to a direct fetch when the cache store itself is broken.
     *
     * @return array{keys: list<array<string, mixed>>}
     */
    private function jwks(): array
    {
        $cacheWarned = false;
        $warnCacheUnavailable = function () use (&$cacheWarned): void {
            if (! $cacheWarned) {
                Log::warning('Cache store unavailable; fetching Clerk JWKS directly. Check CACHE_STORE.');
                $cacheWarned = true;
            }
        };

        try {
            $cached = Cache::get(self::JWKS_CACHE_KEY);
        } catch (Throwable) {
            $warnCacheUnavailable();
            $cached = null;
        }

        if (is_array($cached)) {
            return $cached;
        }

        $response = Http::timeout(5)->get((string) config('clerk.jwks_url'))->throw();
        /** @var array{keys: list<array<string, mixed>>} $jwks */
        $jwks = $response->json();

        try {
            Cache::put(self::JWKS_CACHE_KEY, $jwks, self::JWKS_TTL_SECONDS);
        } catch (Throwable) {
            $warnCacheUnavailable();
        }

        return $jwks;
    }
}
