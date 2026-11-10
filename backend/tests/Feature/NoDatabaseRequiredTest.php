<?php

use Tests\Support\UsesTempJsonStorage;

uses(UsesTempJsonStorage::class);

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

it('defaults the session driver to array when SESSION_DRIVER is unset', function () {
    expect(configWithEnvUnset('session', 'SESSION_DRIVER')['driver'])->toBe('array');
});

it('defaults the queue connection to sync when QUEUE_CONNECTION is unset', function () {
    expect(configWithEnvUnset('queue', 'QUEUE_CONNECTION')['default'])->toBe('sync');
});

it('serves /api/items without any sqlite database file', function () {
    config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => '/nonexistent/database.sqlite']);

    $this->getJson('/api/items')->assertOk();
});
