<?php

namespace App\Services;

use App\DTOs\BulkReviewData;
use App\DTOs\BulkReviewResult;
use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Contracts\UserRepository;
use Carbon\CarbonImmutable;

class ReviewService
{
    public const NOT_FOUND = 'not_found';

    public const ALREADY_REVIEWED = 'already_reviewed';

    public const SAME_PERSON = 'same_person';

    public function __construct(
        private readonly ItemRepository $items,
        private readonly ReviewRepository $reviews,
        private readonly UserRepository $users,
    ) {}

    /** Reviews every pending item in the batch atomically; items that cannot be reviewed (including the reviewer's own) are reported as failures. */
    public function bulkReview(BulkReviewData $data, string $reviewerName): BulkReviewResult
    {
        $reviewer = $this->users->findOrCreateByName($reviewerName);

        return $this->items->transaction(function () use ($data, $reviewer): BulkReviewResult {
            $found = $this->items->findMany($data->ids);
            $now = CarbonImmutable::now();
            $updated = [];
            $failed = [];

            foreach ($data->ids as $id) {
                $item = $found[$id] ?? null;

                if ($item === null) {
                    $failed[] = ['id' => $id, 'reason' => self::NOT_FOUND];

                    continue;
                }

                if ($item->status->isReviewed()) {
                    $failed[] = ['id' => $id, 'reason' => self::ALREADY_REVIEWED];

                    continue;
                }

                if ($item->submitterId === $reviewer->id) {
                    $failed[] = ['id' => $id, 'reason' => self::SAME_PERSON];

                    continue;
                }

                $updated[] = $item->withReview($data->decision, $data->risk ?? $item->risk, $now);
            }

            $this->items->updateMany($updated);

            foreach ($updated as $item) {
                $this->reviews->create([
                    'item_id' => $item->id,
                    'reviewer_id' => $reviewer->id,
                    'decision' => $data->decision,
                    'risk' => $item->risk,
                    'note' => $data->note,
                    'created_at' => $now,
                ]);
            }

            return new BulkReviewResult($updated, $failed);
        });
    }
}
