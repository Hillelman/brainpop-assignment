<?php

use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\UserRepository;
use Tests\Support\UsesTempJsonStorage;

uses(UsesTempJsonStorage::class);

function historyItemId(): int
{
    return app(ItemRepository::class)->create([
        'title' => 'Item',
        'description' => 'Desc',
        'submitter_id' => app(UserRepository::class)->findOrCreateByName('Other')->id,
    ])->id;
}

it('rejects an out-of-range page with a validation error', function (string $page) {
    $id = historyItemId();

    $this->getJson("/api/items/{$id}/reviews?page={$page}")
        ->assertStatus(422)
        ->assertJson(['code' => 'validation_failed'])
        ->assertJsonValidationErrors('page');
})->with(['9223372036854775807', '99999999999999999999999']);

it('returns an empty page at the maximum page', function () {
    $id = historyItemId();

    $this->getJson("/api/items/{$id}/reviews?page=100000")
        ->assertOk()
        ->assertJsonPath('data', [])
        ->assertJsonPath('meta.total', 0)
        ->assertJsonPath('meta.last_page', 1);
});
