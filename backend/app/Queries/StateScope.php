<?php

namespace App\Queries;

use App\Domain\Entities\Item;
use Illuminate\Support\Collection;

enum StateScope: string
{
    case Pending = 'pending';
    case Reviewed = 'reviewed';
    case All = 'all';

    /**
     * @param  Collection<int, Item>  $items
     * @return Collection<int, Item>
     */
    public function apply(Collection $items): Collection
    {
        return match ($this) {
            self::Pending => $items->filter(fn (Item $item): bool => ! $item->status->isReviewed()),
            self::Reviewed => $items->filter(fn (Item $item): bool => $item->status->isReviewed()),
            self::All => $items,
        };
    }
}
