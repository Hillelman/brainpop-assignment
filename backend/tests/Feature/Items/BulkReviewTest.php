<?php

use App\Domain\Entities\Item;
use App\Enums\ItemStatus;
use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Contracts\UserRepository;
use Tests\Support\UsesTempJsonStorage;

uses(UsesTempJsonStorage::class);

function pendingItem(array $attrs = []): Item
{
    return app(ItemRepository::class)->create($attrs + [
        'title' => 'Item',
        'description' => 'Desc',
        'submitter_id' => app(UserRepository::class)->findOrCreateByName('Other')->id,
    ]);
}

it('bulk approves pending items with risk and note', function () {
    $ids = [pendingItem()->id, pendingItem()->id, pendingItem()->id];

    $response = $this->postJson('/api/items/reviews', [
        'ids' => $ids, 'decision' => 'approved', 'risk' => 'high', 'note' => '  looks fine  ', 'reviewer_name' => 'Ben Carter',
    ])->assertOk()
        ->assertJsonPath('meta.updated_count', 3)
        ->assertJsonPath('meta.failed_count', 0)
        ->assertJsonPath('data.failed', []);

    expect(array_column($response->json('data.updated'), 'id'))->toBe($ids);
    foreach ($response->json('data.updated') as $item) {
        expect($item['status'])->toBe('approved')->and($item['risk'])->toBe('high');
    }

    $reviewer = app(UserRepository::class)->findOrCreateByName('Ben Carter');
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

    $response = $this->postJson('/api/items/reviews', [
        'ids' => [$a->id, $b->id], 'decision' => 'rejected', 'note' => "  \n ", 'reviewer_name' => 'Ben Carter',
    ])->assertOk();

    expect($response->json('data.updated.0.risk'))->toBe('low')
        ->and($response->json('data.updated.1.risk'))->toBe('medium')
        ->and($response->json('data.updated.0.status'))->toBe('rejected')
        ->and(app(ReviewRepository::class)->forItem($a->id)->first()->note)->toBeNull();
});

it('reports already reviewed and unknown ids as failures', function () {
    $pending = pendingItem();
    $done = pendingItem(['status' => ItemStatus::Approved]);

    $this->postJson('/api/items/reviews', [
        'ids' => [$done->id, 9999, $pending->id], 'decision' => 'approved', 'reviewer_name' => 'Ben Carter',
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
    $this->postJson('/api/items/reviews', ['ids' => [42], 'decision' => 'approved', 'reviewer_name' => 'Ben Carter'])
        ->assertOk()
        ->assertJsonPath('meta.updated_count', 0)
        ->assertJsonPath('meta.failed_count', 1);
});

it('processes duplicate ids once', function () {
    $item = pendingItem();

    $this->postJson('/api/items/reviews', [
        'ids' => [$item->id, $item->id], 'decision' => 'approved', 'reviewer_name' => 'Ben Carter',
    ])->assertOk()->assertJsonPath('meta.updated_count', 1)->assertJsonPath('meta.failed_count', 0);

    expect(app(ReviewRepository::class)->forItem($item->id))->toHaveCount(1);
});

it('rejects a second review of the same item', function () {
    $item = pendingItem();
    $payload = ['ids' => [$item->id], 'decision' => 'approved', 'reviewer_name' => 'Ben Carter'];

    $this->postJson('/api/items/reviews', $payload)->assertOk();
    $this->postJson('/api/items/reviews', ['decision' => 'rejected'] + $payload)->assertOk()
        ->assertJsonPath('data.failed.0.reason', 'already_reviewed')
        ->assertJsonPath('meta.updated_count', 0);

    expect(app(ReviewRepository::class)->forItem($item->id))->toHaveCount(1);
});

it('validates the payload', function (array $payload) {
    $this->postJson('/api/items/reviews', $payload + ['reviewer_name' => 'Ben Carter'])
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

    $this->postJson('/api/items/reviews', ['ids' => [$item->id], 'decision' => 'approved', 'note' => 'ok', 'reviewer_name' => 'Ben Carter'])->assertOk();

    $this->getJson('/api/items?state=reviewed')->assertOk()
        ->assertJsonPath('data.0.id', $item->id);
    $this->getJson("/api/items/{$item->id}/reviews")->assertOk()
        ->assertJsonPath('data.0.note', 'ok');
});

it('lets a different person review and records them as the reviewer', function () {
    $item = pendingItem(['submitter_id' => app(UserRepository::class)->findOrCreateByName('Ana Lopez')->id]);

    $response = $this->postJson('/api/items/reviews', ['ids' => [$item->id], 'decision' => 'approved', 'reviewer_name' => 'Ben'])
        ->assertOk()
        ->assertJsonPath('meta.updated_count', 1)
        ->assertJsonPath('data.updated.0.id', $item->id)
        ->assertJsonPath('data.updated.0.latest_review.reviewer.name', 'Ben');

    expect($response->json('data.failed'))->toBe([]);
});

it('refuses self-review after name normalization and changes nothing', function () {
    $item = pendingItem(['submitter_id' => app(UserRepository::class)->findOrCreateByName('Ana Lopez')->id]);

    $this->postJson('/api/items/reviews', ['ids' => [$item->id], 'decision' => 'approved', 'reviewer_name' => ' ana   LOPEZ '])
        ->assertOk()
        ->assertJsonPath('data.updated', [])
        ->assertJsonPath('data.failed', [['id' => $item->id, 'reason' => 'same_person']])
        ->assertJsonPath('meta.updated_count', 0)
        ->assertJsonPath('meta.failed_count', 1);

    expect(app(ItemRepository::class)->find($item->id)->status)->toBe(ItemStatus::Pending)
        ->and(app(ReviewRepository::class)->forItem($item->id))->toHaveCount(0);
});

it('reports each reason in a mixed batch', function () {
    $ana = app(UserRepository::class)->findOrCreateByName('Ana Lopez');
    $reviewable = pendingItem();
    $own = pendingItem(['submitter_id' => $ana->id]);
    $done = pendingItem(['status' => ItemStatus::Approved]);

    $this->postJson('/api/items/reviews', [
        'ids' => [$reviewable->id, $own->id, $done->id, 9999], 'decision' => 'rejected', 'reviewer_name' => 'Ana Lopez',
    ])->assertOk()
        ->assertJsonPath('data.updated.0.id', $reviewable->id)
        ->assertJsonPath('data.failed', [
            ['id' => $own->id, 'reason' => 'same_person'],
            ['id' => $done->id, 'reason' => 'already_reviewed'],
            ['id' => 9999, 'reason' => 'not_found'],
        ])
        ->assertJsonPath('meta.updated_count', 1)
        ->assertJsonPath('meta.failed_count', 3);

    expect(app(ItemRepository::class)->find($own->id)->status)->toBe(ItemStatus::Pending);
});

it('rejects an invalid reviewer name and changes nothing', function (array $extra) {
    $item = pendingItem();

    $this->postJson('/api/items/reviews', ['ids' => [$item->id], 'decision' => 'approved'] + $extra)
        ->assertUnprocessable()
        ->assertJson(['code' => 'validation_failed'])
        ->assertJsonValidationErrors('reviewer_name');

    expect(app(ItemRepository::class)->find($item->id)->status)->toBe(ItemStatus::Pending)
        ->and(app(ReviewRepository::class)->forItem($item->id))->toHaveCount(0);
})->with([
    'missing' => [[]],
    'whitespace only' => [['reviewer_name' => '   ']],
    'one character' => [['reviewer_name' => 'B']],
    '61 characters' => [['reviewer_name' => str_repeat('b', 61)]],
]);
