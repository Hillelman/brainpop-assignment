<?php

use App\Domain\Entities\Item;
use App\Domain\Entities\Review;
use App\Domain\Entities\User;
use App\Enums\ItemStatus;
use App\Enums\ReviewDecision;
use App\Enums\RiskLevel;

it('round-trips a user with UTC ISO-8601 timestamps', function () {
    $data = ['id' => 1, 'clerk_id' => 'c1', 'name' => 'A', 'email' => 'a@x.io', 'created_at' => '2026-01-02T03:04:05+00:00'];

    expect(User::fromArray($data)->toArray())->toBe($data);
});

it('round-trips an item and normalises offsets to UTC', function () {
    $item = Item::fromArray([
        'id' => 2, 'title' => 'T', 'description' => 'D', 'submitter_id' => 1, 'status' => 'pending',
        'risk' => null, 'created_at' => '2026-01-02T05:04:05+02:00', 'updated_at' => '2026-01-02T03:04:05+00:00',
    ]);

    expect($item->toArray()['created_at'])->toBe('2026-01-02T03:04:05+00:00')
        ->and(Item::fromArray($item->toArray())->toArray())->toBe($item->toArray());
});

it('round-trips a review', function () {
    $data = [
        'id' => 3, 'item_id' => 2, 'reviewer_id' => 1, 'decision' => 'rejected', 'risk' => 'high',
        'note' => 'No', 'created_at' => '2026-01-02T03:04:05+00:00',
    ];

    expect(Review::fromArray($data)->toArray())->toBe($data);
});

it('maps enums', function () {
    expect(ItemStatus::Pending->isReviewed())->toBeFalse()
        ->and(ItemStatus::Approved->isReviewed())->toBeTrue()
        ->and(ReviewDecision::Rejected->toStatus())->toBe(ItemStatus::Rejected)
        ->and(RiskLevel::High->weight())->toBeGreaterThan(RiskLevel::Low->weight());
});
