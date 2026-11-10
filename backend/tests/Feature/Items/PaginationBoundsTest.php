<?php

use Tests\Support\UsesTempJsonStorage;

uses(UsesTempJsonStorage::class);

it('rejects an out-of-range page with a validation error', function (string $uri) {
    $this->getJson($uri)
        ->assertStatus(422)
        ->assertJson(['code' => 'validation_failed'])
        ->assertJsonValidationErrors('page');
})->with([
    '/api/items?page=9223372036854775807',
    '/api/items/search?q=a&page=9223372036854775807',
    '/api/items?page=99999999999999999999999',
]);

it('returns an empty page at the maximum page', function () {
    $this->getJson('/api/items?page=100000')
        ->assertOk()
        ->assertJsonPath('data', [])
        ->assertJsonPath('meta.total', 0)
        ->assertJsonPath('meta.last_page', 1);
});
