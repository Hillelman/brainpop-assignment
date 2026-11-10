<?php

use App\Domain\Entities\User;
use App\DTOs\BulkReviewData;
use App\Enums\ItemStatus;
use App\Enums\ReviewDecision;
use App\Enums\RiskLevel;
use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Contracts\UserRepository;
use App\Services\ReviewService;
use Tests\Support\UsesTempJsonStorage;
use Tests\TestCase;

uses(TestCase::class, UsesTempJsonStorage::class);

function reviewer(): User
{
    return app(UserRepository::class)->upsertFromClerk('user_rev', 'Rev', 'r@x.io');
}

it('keeps the existing risk when none is given and overrides it otherwise', function () {
    $items = app(ItemRepository::class);
    $a = $items->create(['title' => 'A', 'description' => 'D', 'submitter_id' => 1, 'risk' => RiskLevel::Low]);
    $b = $items->create(['title' => 'B', 'description' => 'D', 'submitter_id' => 1, 'risk' => RiskLevel::Low]);

    $kept = app(ReviewService::class)->bulkReview(new BulkReviewData([$a->id], ReviewDecision::Approved, null, null), reviewer());
    $changed = app(ReviewService::class)->bulkReview(new BulkReviewData([$b->id], ReviewDecision::Rejected, RiskLevel::High, 'n'), reviewer());

    expect($kept->updated[0]->risk)->toBe(RiskLevel::Low)
        ->and($changed->updated[0]->risk)->toBe(RiskLevel::High)
        ->and($changed->updated[0]->status)->toBe(ItemStatus::Rejected)
        ->and($items->find($b->id)->status)->toBe(ItemStatus::Rejected)
        ->and(app(ReviewRepository::class)->forItem($b->id)->first()->risk)->toBe(RiskLevel::High);
});

it('preserves input order across failures and updates', function () {
    $item = app(ItemRepository::class)->create(['title' => 'A', 'description' => 'D', 'submitter_id' => 1]);

    $result = app(ReviewService::class)->bulkReview(new BulkReviewData([77, $item->id], ReviewDecision::Approved, null, null), reviewer());

    expect($result->failed)->toBe([['id' => 77, 'reason' => 'not_found']])
        ->and($result->updated)->toHaveCount(1);
});
