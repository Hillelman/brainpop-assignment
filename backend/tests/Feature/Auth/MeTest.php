<?php

use App\Auth\Contracts\TokenVerifier;
use Tests\Support\ActsAsClerkUser;
use Tests\Support\FakeTokenVerifier;
use Tests\Support\UsesTempJsonStorage;

uses(ActsAsClerkUser::class, UsesTempJsonStorage::class);

it('rejects /api/me without a token', function () {
    $this->getJson('/api/me')
        ->assertUnauthorized()
        ->assertJson(['code' => 'unauthenticated'])
        ->assertJsonStructure(['message', 'code']);
});

it('rejects a non-bearer authorization scheme', function () {
    $this->withHeader('Authorization', 'Basic abc')->getJson('/api/me')
        ->assertUnauthorized()
        ->assertJson(['code' => 'unauthenticated']);
});

it('rejects /api/me with an invalid token', function () {
    $this->app->bind(TokenVerifier::class, FakeTokenVerifier::class);

    $this->withHeader('Authorization', 'Bearer garbage')->getJson('/api/me')
        ->assertUnauthorized()
        ->assertJson(['code' => 'unauthenticated']);
});

it('returns the current user and upserts exactly once', function () {
    $this->actingAsClerk('user_1', 'a@example.com')->getJson('/api/me')
        ->assertOk()
        ->assertJsonStructure(['data' => ['id', 'name', 'email']])
        ->assertJsonPath('data.email', 'a@example.com');

    $this->actingAsClerk('user_1', 'a@example.com')->getJson('/api/me')->assertOk();

    $users = json_decode(file_get_contents($this->jsonStoragePath.'/users.json'), true);
    expect($users)->toHaveCount(1);
});

it('falls back to the subject as name when the email is empty', function () {
    $this->actingAsClerk('user_2', '')->getJson('/api/me')
        ->assertOk()
        ->assertJsonPath('data.name', 'user_2')
        ->assertJsonPath('data.email', '');
});
