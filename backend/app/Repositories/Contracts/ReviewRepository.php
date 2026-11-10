<?php

namespace App\Repositories\Contracts;

use App\Domain\Entities\Review;
use Illuminate\Support\Collection;

interface ReviewRepository
{
    /**
     * Creates a review. Required keys: item_id, reviewer_id, decision (ReviewDecision). Optional:
     * risk (RiskLevel), note, created_at (default now).
     *
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): Review;

    /**
     * Reviews of one item, oldest first.
     *
     * @return Collection<int, Review>
     */
    public function forItem(int $itemId): Collection;

    /**
     * Reviews of many items in a single read.
     *
     * @param  list<int>  $ids
     * @return array<int, Collection<int, Review>> keyed by item id; every requested id is present
     */
    public function forItems(array $ids): array;
}
