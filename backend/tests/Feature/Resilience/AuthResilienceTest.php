<?php

use App\Auth\ClerkJwksTokenVerifier;
use App\Auth\Contracts\TokenVerifier;
use Firebase\JWT\JWT;
use Illuminate\Cache\ArrayStore;
use Illuminate\Cache\Repository;
use Illuminate\Contracts\Cache\Store;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\Support\UsesTempJsonStorage;

uses(UsesTempJsonStorage::class);

/**
 * @return array{private: string, jwks: array{keys: list<array<string, string>>}}
 */
function resilienceKeyPair(): array
{
    $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    openssl_pkey_export($key, $private);
    $details = openssl_pkey_get_details($key)['rsa'];
    $b64 = fn (string $v): string => rtrim(strtr(base64_encode($v), '+/', '-_'), '=');

    return [
        'private' => $private,
        'jwks' => ['keys' => [[
            'kty' => 'RSA', 'use' => 'sig', 'alg' => 'RS256', 'kid' => 'kid-1',
            'n' => $b64($details['n']), 'e' => $b64($details['e']),
        ]]],
    ];
}

function throwingCacheStore(): Store
{
    return new class extends ArrayStore
    {
        public function get($key)
        {
            throw new RuntimeException('Database file at path [database.sqlite] does not exist.');
        }

        public function put($key, $value, $seconds)
        {
            throw new RuntimeException('Database file at path [database.sqlite] does not exist.');
        }
    };
}

beforeEach(function () {
    config(['clerk.jwks_url' => 'https://clerk.test/jwks', 'clerk.issuer' => null, 'clerk.authorized_parties' => []]);
    $this->app->bind(TokenVerifier::class, ClerkJwksTokenVerifier::class);
});

it('verifies tokens and logs a warning when the cache store throws', function () {
    Cache::swap(new Repository(throwingCacheStore()));
    Log::spy();
    $pair = resilienceKeyPair();
    Http::fake(['clerk.test/*' => Http::response($pair['jwks'])]);
    $jwt = JWT::encode(['sub' => 'user_1', 'exp' => time() + 60], $pair['private'], 'RS256', 'kid-1');

    $this->withHeader('Authorization', "Bearer {$jwt}")->getJson('/api/me')->assertOk();

    Log::shouldHaveReceived('warning')->once()->with('Cache store unavailable; fetching Clerk JWKS directly. Check CACHE_STORE.');
});

it('returns 401 when the JWKS endpoint is unreachable', function () {
    Http::fake(fn () => throw new ConnectionException('unreachable https://clerk.test/jwks'));
    Log::spy();

    $this->withHeader('Authorization', 'Bearer a.b.c')->getJson('/api/me')
        ->assertUnauthorized()
        ->assertJsonPath('code', 'unauthenticated');

    Log::shouldHaveReceived('error')->once()->with('Unable to load Clerk JWKS.', ['exception_class' => ConnectionException::class]);
});

it('returns 503 auth_not_configured without leaking values when CLERK_JWKS_URL is missing', function (string $method, string $uri) {
    config(['clerk.jwks_url' => null, 'clerk.secret_key' => 'sk_secret_value']);
    Log::spy();

    $response = $this->json($method, $uri)
        ->assertStatus(503)
        ->assertJsonPath('code', 'auth_not_configured')
        ->assertJsonPath('errors.missing', ['CLERK_JWKS_URL']);

    expect($response->getContent())->not->toContain('sk_secret_value');
    Log::shouldHaveReceived('warning')->once();
})->with([
    ['GET', '/api/me'],
    ['GET', '/api/items'],
    ['POST', '/api/items/reviews'],
]);

it('treats an empty CLERK_JWKS_URL as missing', function () {
    config(['clerk.jwks_url' => '']);

    $this->getJson('/api/me')->assertStatus(503)->assertJsonPath('code', 'auth_not_configured');
});

it('returns 503 app_not_configured as JSON when APP_KEY is missing', function () {
    config(['app.key' => '']);
    $this->app->forgetInstance('encrypter');

    $this->getJson('/api/items')
        ->assertStatus(503)
        ->assertJsonPath('code', 'app_not_configured')
        ->assertJsonPath('errors.missing', ['APP_KEY']);
});

it('reports health checks as booleans', function () {
    $this->getJson('/api/health')->assertOk()->assertJson(['status' => 'ok', 'checks' => [
        'app_key' => true, 'clerk' => true, 'storage_writable' => true,
    ]]);
});

it('reports false health checks when configuration is missing', function () {
    config(['app.key' => '', 'clerk.jwks_url' => null, 'storage_json.path' => '/proc/nonexistent/dir']);

    $this->getJson('/api/health')->assertOk()->assertExactJson(['status' => 'ok', 'checks' => [
        'app_key' => false, 'clerk' => false, 'storage_writable' => false,
    ]]);
});

it('boots with an empty environment', function () {
    $env = ['PATH' => (string) getenv('PATH'), 'HOME' => sys_get_temp_dir(), 'APP_ENV' => 'testing'];
    $process = proc_open(
        [PHP_BINARY, 'artisan', 'route:list', '--json'],
        [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes,
        base_path(),
        $env,
    );
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    $exit = proc_close($process);

    expect($exit)->toBe(0, $stderr)->and(array_column(json_decode($stdout, true), 'uri'))->toContain('api/health');
});
