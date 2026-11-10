<?php

namespace App\Repositories\Json;

use App\Domain\Entities\Review;
use App\Enums\ReviewDecision;
use App\Enums\RiskLevel;
use App\Repositories\Contracts\ReviewRepository;
use App\Storage\CollectionTransaction;
use App\Storage\JsonStore;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final class JsonReviewRepository implements ReviewRepository
{
    private const COLLECTION = 'reviews';

    public function __construct(private readonly JsonStore $store) {}

    public function create(array $attributes): Review
    {
        $decision = $attributes['decision'];
        $risk = $attributes['risk'] ?? null;

        return $this->store->transaction(self::COLLECTION, fn (CollectionTransaction $tx): Review => Review::fromArray($tx->insert([
            'item_id' => $attributes['item_id'],
            'reviewer_id' => $attributes['reviewer_id'],
            'decision' => $decision instanceof ReviewDecision ? $decision->value : $decision,
            'risk' => $risk instanceof RiskLevel ? $risk->value : $risk,
            'note' => $attributes['note'] ?? null,
            'created_at' => CarbonImmutable::parse($attributes['created_at'] ?? 'now')->utc()->toIso8601String(),
        ])));
    }

    public function forItem(int $itemId): Collection
    {
        return $this->forItems([$itemId])[$itemId];
    }

    public function forItems(array $ids): array
    {
        $grouped = [];
        foreach ($ids as $id) {
            $grouped[$id] = [];
        }

        foreach ($this->store->read(self::COLLECTION) as $record) {
            if (isset($grouped[$record['item_id']])) {
                $grouped[(int) $record['item_id']][] = Review::fromArray($record);
            }
        }

        return array_map(fn (array $reviews): Collection => collect($reviews), $grouped);
    }
}
