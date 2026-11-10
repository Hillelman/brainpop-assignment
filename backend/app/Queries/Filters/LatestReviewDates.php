<?php

namespace App\Queries\Filters;

use App\Domain\Entities\Item;
use App\Repositories\Contracts\ReviewRepository;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use WeakMap;

/**
 * Resolves the date of each item's latest review with one batched read per query. Registered as scoped, so the from
 * and to filters of one request share this instance. Results are memoised per Item instance, so a later request
 * (fresh instances) reloads.
 */
class LatestReviewDates
{
    /** @var WeakMap<Item, CarbonImmutable|null>|null */
    private ?WeakMap $memo = null;

    public function __construct(private readonly ReviewRepository $reviews) {}

    /**
     * @param  Collection<int, Item>  $items
     * @return WeakMap<Item, CarbonImmutable|null>
     */
    public function for(Collection $items): WeakMap
    {
        $this->memo ??= new WeakMap;
        $missing = $items->filter(fn (Item $item): bool => ! $this->memo->offsetExists($item));

        if ($missing->isNotEmpty()) {
            $byItem = $this->reviews->forItems($missing->pluck('id')->all());
            foreach ($missing as $item) {
                $this->memo[$item] = ($byItem[$item->id] ?? collect())->last()?->createdAt;
            }
        }

        return $this->memo;
    }
}
