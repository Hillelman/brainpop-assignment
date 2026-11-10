<?php

use App\Auth\ClerkJwksTokenVerifier;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\Support\ActsAsClerkUser;
use Tests\Support\UsesTempJsonStorage;

uses(ActsAsClerkUser::class, UsesTempJsonStorage::class);

function configWithEnvUnset(string $file, string $envKey): mixed
{
    $previous = getenv($envKey);

    putenv($envKey);
    unset($_ENV[$envKey], $_SERVER[$envKey]);

    try {
        return require base_path("config/{$file}.php");
    } finally {
        if ($previous !== false) {
            putenv("{$envKey}={$previous}");
            $_ENV[$envKey] = $previous;
            $_SERVER[$envKey] = $previous;
        }
    }
}

it('defaults the cache store to file when CACHE_STORE is unset', function () {
    expect(configWithEnvUnset('cache', 'CACHE_STORE')['default'])->toBe('file');
});

it('defaults the session driver to file when SESSION_DRIVER is unset', function () {
    expect(configWithEnvUnset('session', 'SESSION_DRIVER')['driver'])->toBe('file');
});

it('defaults the queue connection to sync when QUEUE_CONNECTION is unset', function () {
    expect(configWithEnvUnset('queue', 'QUEUE_CONNECTION')['default'])->toBe('sync');
});

it('serves /api/me without any sqlite database file', function () {
    config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => '/nonexistent/database.sqlite']);

    $this->actingAsClerk('user_1', 'a@example.com')->getJson('/api/me')->assertOk();
});

it('caches the JWKS so a second verification makes no extra HTTP call', function () {
    Cache::flush();
    config(['clerk.jwks_url' => 'https://clerk.test/jwks', 'clerk.issuer' => '', 'clerk.authorized_parties' => []]);
    Http::fake(['clerk.test/*' => Http::response(['keys' => []])]);

    $verifier = new ClerkJwksTokenVerifier;
    foreach ([1, 2] as $_) {
        try {
            $verifier->verify('not.a.jwt');
        } catch (Throwable) {
        }
    }

    Http::assertSentCount(1);
});
