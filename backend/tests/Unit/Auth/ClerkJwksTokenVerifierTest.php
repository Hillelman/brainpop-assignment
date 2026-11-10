<?php

use App\Auth\ClerkJwksTokenVerifier;
use Firebase\JWT\JWT;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class);

/**
 * @return array{private: string, jwks: array{keys: list<array<string, string>>}}
 */
function makeKeyPair(string $kid = 'kid-1'): array
{
    $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    openssl_pkey_export($key, $private);
    $details = openssl_pkey_get_details($key)['rsa'];
    $b64 = fn (string $v): string => rtrim(strtr(base64_encode($v), '+/', '-_'), '=');

    return [
        'private' => $private,
        'jwks' => ['keys' => [[
            'kty' => 'RSA', 'use' => 'sig', 'alg' => 'RS256', 'kid' => $kid,
            'n' => $b64($details['n']), 'e' => $b64($details['e']),
        ]]],
    ];
}

beforeEach(function () {
    config(['clerk.jwks_url' => 'https://clerk.test/.well-known/jwks.json', 'clerk.issuer' => null, 'clerk.authorized_parties' => []]);
});

it('accepts a valid RS256 token', function () {
    $pair = makeKeyPair();
    Http::fake(['clerk.test/*' => Http::response($pair['jwks'])]);
    $jwt = JWT::encode(['sub' => 'user_1', 'email' => 'a@x.io', 'name' => 'Ann', 'exp' => time() + 60], $pair['private'], 'RS256', 'kid-1');

    $claims = app(ClerkJwksTokenVerifier::class)->verify($jwt);

    expect($claims->sub)->toBe('user_1')->and($claims->email)->toBe('a@x.io')->and($claims->name)->toBe('Ann');
});

it('falls back to sub for a missing name and empty email', function () {
    $pair = makeKeyPair();
    Http::fake(['clerk.test/*' => Http::response($pair['jwks'])]);
    $jwt = JWT::encode(['sub' => 'user_1', 'exp' => time() + 60], $pair['private'], 'RS256', 'kid-1');

    $claims = app(ClerkJwksTokenVerifier::class)->verify($jwt);

    expect($claims->name)->toBe('user_1')->and($claims->email)->toBe('');
});

it('rejects an expired token', function () {
    $pair = makeKeyPair();
    Http::fake(['clerk.test/*' => Http::response($pair['jwks'])]);
    $jwt = JWT::encode(['sub' => 'user_1', 'exp' => time() - 60], $pair['private'], 'RS256', 'kid-1');

    app(ClerkJwksTokenVerifier::class)->verify($jwt);
})->throws(AuthenticationException::class);

it('rejects a token signed by an unknown key', function () {
    $trusted = makeKeyPair();
    $other = makeKeyPair();
    Http::fake(['clerk.test/*' => Http::response($trusted['jwks'])]);
    $jwt = JWT::encode(['sub' => 'user_1', 'exp' => time() + 60], $other['private'], 'RS256', 'kid-1');

    app(ClerkJwksTokenVerifier::class)->verify($jwt);
})->throws(AuthenticationException::class);

it('rejects a token from an unauthorized party', function () {
    config(['clerk.authorized_parties' => ['https://app.test']]);
    $pair = makeKeyPair();
    Http::fake(['clerk.test/*' => Http::response($pair['jwks'])]);
    $jwt = JWT::encode(['sub' => 'user_1', 'azp' => 'https://evil.test', 'exp' => time() + 60], $pair['private'], 'RS256', 'kid-1');

    app(ClerkJwksTokenVerifier::class)->verify($jwt);
})->throws(AuthenticationException::class);

it('rejects a token with the wrong issuer', function () {
    config(['clerk.issuer' => 'https://clerk.test']);
    $pair = makeKeyPair();
    Http::fake(['clerk.test/*' => Http::response($pair['jwks'])]);
    $jwt = JWT::encode(['sub' => 'user_1', 'iss' => 'https://other.test', 'exp' => time() + 60], $pair['private'], 'RS256', 'kid-1');

    app(ClerkJwksTokenVerifier::class)->verify($jwt);
})->throws(AuthenticationException::class);

it('turns an unreachable JWKS endpoint into an authentication failure', function () {
    Http::fake(['clerk.test/*' => Http::response('down', 500)]);

    app(ClerkJwksTokenVerifier::class)->verify('a.b.c');
})->throws(AuthenticationException::class);
