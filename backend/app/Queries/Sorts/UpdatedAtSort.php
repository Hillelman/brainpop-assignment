<?php

namespace App\Queries\Sorts;

use App\Domain\Entities\Item;
use App\Queries\Sorts\Contracts\Sort;
use Illuminate\Support\Collection;

class UpdatedAtSort implements Sort
{
    public function key(): string
    {
        return 'updated_at';
    }

    public function label(): string
    {
        return 'Updated';
    }

    public function prepare(Collection $items): void {}

    public function value(Item $item): int
    {
        return $item->updatedAt->getTimestamp();
    }
}
