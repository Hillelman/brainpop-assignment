<?php

namespace App\Queries\Sorts;

use App\Domain\Entities\Item;
use App\Queries\Sorts\Contracts\Sort;

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

    public function value(Item $item): int
    {
        return $item->updatedAt->getTimestamp();
    }
}
