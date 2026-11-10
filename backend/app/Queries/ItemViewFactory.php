<?php

namespace App\Queries;

use App\Domain\Entities\Item;
use App\Domain\Entities\Review;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Contracts\UserRepository;
use Illuminate\Support\Collection;

/**
 * Attaches submitters, reviewers and latest reviews to items using one batched read per relation.
 */
class ItemViewFactory
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly ReviewRepository $reviews,
    ) {}

    /**
     * @param  Collection<int, Item>  $items
     * @return Collection<int, ItemView>
     */
    public function items(Collection $items): Collection
    {
        $items = $items->values();
        $reviewsByItem = $this->reviews->forItems($items->pluck('id')->all());
        $latest = $items->map(fn (Item $item): ?Review => ($reviewsByItem[$item->id] ?? collect())->last());

        $users = $this->users->findMany([
            ...$items->pluck('submitterId')->all(),
            ...$latest->filter()->pluck('reviewerId')->all(),
        ]);

        return $items->map(function (Item $item, int $index) use ($latest, $users): ItemView {
            $review = $latest[$index];

            return new ItemView(
                $item,
                $users[$item->submitterId] ?? null,
                $review === null ? null : new ReviewView($review, $users[$review->reviewerId] ?? null),
            );
        });
    }

    /**
     * @param  Collection<int, Review>  $reviews
     * @return Collection<int, ReviewView>
     */
    public function reviews(Collection $reviews): Collection
    {
        $users = $this->users->findMany($reviews->pluck('reviewerId')->all());

        return $reviews->values()->map(
            fn (Review $review): ReviewView => new ReviewView($review, $users[$review->reviewerId] ?? null),
        );
    }
}
