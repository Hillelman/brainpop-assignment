<?php

use App\Enums\ItemStatus;
use App\Enums\ReviewDecision;
use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Contracts\UserRepository;
use App\Repositories\Json\JsonUserRepository;
use App\Storage\JsonStore;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Tests\Support\UsesTempJsonStorage;
use Tests\TestCase;

uses(TestCase::class, UsesTempJsonStorage::class);

it('finds or creates users by normalized name without duplicating', function () {
    $users = app(UserRepository::class);

    $first = $users->findOrCreateByName('  Ana   Lopez ');
    $second = $users->findOrCreateByName('ana lopez');
    $accent = $users->findOrCreateByName('José');
    $plain = $users->findOrCreateByName('Jose');

    expect($second->id)->toBe($first->id)
        ->and($first->name)->toBe('Ana Lopez')
        ->and($accent->id)->not->toBe($plain->id)
        ->and(json_decode(file_get_contents($this->jsonStoragePath.'/users.json'), true))->toHaveCount(3);
});

it('creates one user when separate store instances use the same new name', function () {
    $first = (new JsonUserRepository(new JsonStore($this->jsonStoragePath)))->findOrCreateByName('New Person');
    $second = (new JsonUserRepository(new JsonStore($this->jsonStoragePath)))->findOrCreateByName('new  person');

    expect($second->id)->toBe($first->id)
        ->and(json_decode(file_get_contents($this->jsonStoragePath.'/users.json'), true))->toHaveCount(1);
});

it('loads legacy users.json rows that still carry clerk_id and email', function () {
    File::ensureDirectoryExists($this->jsonStoragePath);
    File::put($this->jsonStoragePath.'/users.json', json_encode([
        ['id' => 5, 'clerk_id' => 'user_x', 'name' => 'Old Timer', 'email' => 'o@x.io', 'created_at' => '2026-01-02T03:04:05+00:00'],
    ]));

    $users = app(UserRepository::class);

    expect($users->findMany([5])[5]->name)->toBe('Old Timer')
        ->and($users->findOrCreateByName('old  TIMER')->id)->toBe(5);
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

it('seeds named people and never lets a reviewer review their own item', function () {
    Artisan::call('app:seed-json', ['--count' => 60, '--fresh' => true]);

    $items = app(ItemRepository::class)->all()->keyBy('id');
    $reviews = app(ReviewRepository::class)->forItems($items->keys()->all());
    $users = json_decode(file_get_contents($this->jsonStoragePath.'/users.json'), true);

    expect(array_column($users, 'name'))->toContain('Ana Lopez', 'Ben Carter')
        ->and($users)->toHaveCount(5);

    foreach ($reviews as $itemId => $itemReviews) {
        foreach ($itemReviews as $review) {
            expect($review->reviewerId)->not->toBe($items[$itemId]->submitterId);
        }
    }
});
