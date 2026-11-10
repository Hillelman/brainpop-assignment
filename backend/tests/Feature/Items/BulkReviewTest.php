<?php

use App\Domain\Entities\Item;
use App\Enums\ItemStatus;
use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Contracts\UserRepository;
use Tests\Support\ActsAsClerkUser;
use Tests\Support\UsesTempJsonStorage;

uses(ActsAsClerkUser::class, UsesTempJsonStorage::class);

function pendingItem(array $attrs = []): Item
{
    return app(ItemRepository::class)->create($attrs + [
        'title' => 'Item',
        'description' => 'Desc',
        'submitter_id' => app(UserRepository::class)->upsertFromClerk('user_other', 'Other', 'o@x.io')->id,
    ]);
}

it('requires a token', function () {
    $this->postJson('/api/items/reviews', [])->assertUnauthorized();
});

it('bulk approves pending items with risk and note', function () {
    $ids = [pendingItem()->id, pendingItem()->id, pendingItem()->id];

    $response = $this->actingAsClerk('user_rev')->postJson('/api/items/reviews', [
        'ids' => $ids, 'decision' => 'approved', 'risk' => 'high', 'note' => '  looks fine  ',
    ])->assertOk()
        ->assertJsonPath('meta.updated_count', 3)
        ->assertJsonPath('meta.failed_count', 0)
        ->assertJsonPath('data.failed', []);

    expect(array_column($response->json('data.updated'), 'id'))->toBe($ids);
    foreach ($response->json('data.updated') as $item) {
        expect($item['status'])->toBe('approved')->and($item['risk'])->toBe('high');
    }

    $reviewer = app(UserRepository::class)->findByClerkId('user_rev');
    foreach ($ids as $id) {
        $reviews = app(ReviewRepository::class)->forItem($id);
        expect($reviews)->toHaveCount(1)
            ->and($reviews->first()->note)->toBe('looks fine')
            ->and($reviews->first()->reviewerId)->toBe($reviewer->id);
    }
});

it('keeps existing risk and stores a null note when rejecting without them', function () {
    $a = pendingItem(['risk' => 'low']);
    $b = pendingItem(['risk' => 'medium']);

    $response = $this->actingAsClerk()->postJson('/api/items/reviews', [
        'ids' => [$a->id, $b->id], 'decision' => 'rejected', 'note' => "  \n ",
    ])->assertOk();

    expect($response->json('data.updated.0.risk'))->toBe('low')
        ->and($response->json('data.updated.1.risk'))->toBe('medium')
        ->and($response->json('data.updated.0.status'))->toBe('rejected')
        ->and(app(ReviewRepository::class)->forItem($a->id)->first()->note)->toBeNull();
});

it('reports already reviewed and unknown ids as failures', function () {
    $pending = pendingItem();
    $done = pendingItem(['status' => ItemStatus::Approved]);

    $this->actingAsClerk()->postJson('/api/items/reviews', [
        'ids' => [$done->id, 9999, $pending->id], 'decision' => 'approved',
    ])->assertOk()
        ->assertJsonPath('data.updated.0.id', $pending->id)
        ->assertJsonPath('data.failed', [
            ['id' => $done->id, 'reason' => 'already_reviewed'],
            ['id' => 9999, 'reason' => 'not_found'],
        ])
        ->assertJsonPath('meta.updated_count', 1)
        ->assertJsonPath('meta.failed_count', 2);
});

it('returns 200 when every id fails', function () {
    $this->actingAsClerk()->postJson('/api/items/reviews', ['ids' => [42], 'decision' => 'approved'])
        ->assertOk()
        ->assertJsonPath('meta.updated_count', 0)
        ->assertJsonPath('meta.failed_count', 1);
});

it('processes duplicate ids once', function () {
    $item = pendingItem();

    $this->actingAsClerk()->postJson('/api/items/reviews', [
        'ids' => [$item->id, $item->id], 'decision' => 'approved',
    ])->assertOk()->assertJsonPath('meta.updated_count', 1)->assertJsonPath('meta.failed_count', 0);

    expect(app(ReviewRepository::class)->forItem($item->id))->toHaveCount(1);
});

it('rejects a second review of the same item', function () {
    $item = pendingItem();
    $payload = ['ids' => [$item->id], 'decision' => 'approved'];

    $this->actingAsClerk()->postJson('/api/items/reviews', $payload)->assertOk();
    $this->actingAsClerk()->postJson('/api/items/reviews', ['decision' => 'rejected'] + $payload)->assertOk()
        ->assertJsonPath('data.failed.0.reason', 'already_reviewed')
        ->assertJsonPath('meta.updated_count', 0);

    expect(app(ReviewRepository::class)->forItem($item->id))->toHaveCount(1);
});

it('validates the payload', function (array $payload) {
    $this->actingAsClerk()->postJson('/api/items/reviews', $payload)
        ->assertUnprocessable()->assertJson(['code' => 'validation_failed']);
})->with([
    'empty ids' => [['ids' => [], 'decision' => 'approved']],
    'missing ids' => [['decision' => 'approved']],
    '101 ids' => [['ids' => range(1, 101), 'decision' => 'approved']],
    'string ids' => [['ids' => ['abc'], 'decision' => 'approved']],
    'zero id' => [['ids' => [0], 'decision' => 'approved']],
    'invalid decision' => [['ids' => [1], 'decision' => 'maybe']],
    'missing decision' => [['ids' => [1]]],
    'invalid risk' => [['ids' => [1], 'decision' => 'approved', 'risk' => 'extreme']],
    'long note' => [['ids' => [1], 'decision' => 'approved', 'note' => str_repeat('a', 1001)]],
]);

it('shows reviewed items in the reviewed state and in the review history', function () {
    $item = pendingItem();

    $this->actingAsClerk()->postJson('/api/items/reviews', ['ids' => [$item->id], 'decision' => 'approved', 'note' => 'ok'])->assertOk();

    $this->actingAsClerk()->getJson('/api/items?state=reviewed')->assertOk()
        ->assertJsonPath('data.0.id', $item->id);
    $this->actingAsClerk()->getJson("/api/items/{$item->id}/reviews")->assertOk()
        ->assertJsonPath('data.0.note', 'ok');
});
