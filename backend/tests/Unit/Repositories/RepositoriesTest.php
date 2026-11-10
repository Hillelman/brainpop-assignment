<?php

use App\Enums\ItemStatus;
use App\Enums\ReviewDecision;
use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Contracts\UserRepository;
use Illuminate\Support\Facades\Artisan;
use Tests\Support\UsesTempJsonStorage;
use Tests\TestCase;

uses(TestCase::class, UsesTempJsonStorage::class);

it('upserts users from Clerk without duplicating', function () {
    $users = app(UserRepository::class);

    $first = $users->upsertFromClerk('clerk_1', 'Old', 'old@x.io');
    $second = $users->upsertFromClerk('clerk_1', 'New', 'new@x.io');

    expect($second->id)->toBe($first->id)
        ->and($users->findByClerkId('clerk_1')->name)->toBe('New')
        ->and($users->findByClerkId('clerk_1')->email)->toBe('new@x.io')
        ->and($users->findByClerkId('missing'))->toBeNull()
        ->and(json_decode(file_get_contents($this->jsonStoragePath.'/users.json'), true))->toHaveCount(1);
});

it('finds many items ignoring unknown ids and duplicates', function () {
    $items = app(ItemRepository::class);
    $a = $items->create(['title' => 'A', 'description' => 'a', 'submitter_id' => 1]);
    $items->create(['title' => 'B', 'description' => 'b', 'submitter_id' => 1]);

    $found = $items->findMany([$a->id, $a->id, 999]);

    expect($found)->toHaveCount(1)->and(array_keys($found))->toBe([$a->id])
        ->and($a->status)->toBe(ItemStatus::Pending)
        ->and($items->find(999))->toBeNull();
});

it('updates several items atomically inside a transaction', function () {
    $items = app(ItemRepository::class);
    $a = $items->create(['title' => 'A', 'description' => 'a', 'submitter_id' => 1]);
    $b = $items->create(['title' => 'B', 'description' => 'b', 'submitter_id' => 1]);

    $items->transaction(function () use ($items, $a, $b) {
        $fresh = $items->findMany([$a->id, $b->id]);
        $items->updateMany(array_map(
            fn ($item) => $item->withReview(ReviewDecision::Approved, null, now()->toImmutable()),
            $fresh,
        ));
    });

    expect($items->all()->every(fn ($item) => $item->status === ItemStatus::Approved))->toBeTrue();
});

it('groups reviews by item id', function () {
    $reviews = app(ReviewRepository::class);
    $reviews->create(['item_id' => 1, 'reviewer_id' => 1, 'decision' => ReviewDecision::Approved]);
    $reviews->create(['item_id' => 2, 'reviewer_id' => 1, 'decision' => ReviewDecision::Rejected, 'note' => 'n']);
    $reviews->create(['item_id' => 1, 'reviewer_id' => 2, 'decision' => ReviewDecision::Rejected]);

    $grouped = $reviews->forItems([1, 2, 3]);

    expect($grouped[1])->toHaveCount(2)
        ->and($grouped[2])->toHaveCount(1)
        ->and($grouped[3])->toHaveCount(0)
        ->and($reviews->forItem(2)->first()->note)->toBe('n');
});

it('seeds mixed items with a review for each reviewed item', function () {
    Artisan::call('app:seed-json', ['--count' => 10, '--fresh' => true, '--seed' => 42]);

    $items = app(ItemRepository::class)->all();
    $reviews = app(ReviewRepository::class)->forItems($items->pluck('id')->all());

    expect($items)->toHaveCount(10)
        ->and($items->pluck('status')->unique())->toHaveCount(3);

    foreach ($items as $item) {
        expect($reviews[$item->id]->count())->toBe($item->status->isReviewed() ? 1 : 0);
    }
});
