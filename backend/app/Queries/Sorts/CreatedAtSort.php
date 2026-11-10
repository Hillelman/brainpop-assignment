<?php

namespace App\Queries\Sorts;

use App\Domain\Entities\Item;
use App\Queries\Sorts\Contracts\Sort;

class CreatedAtSort implements Sort
{
    public function key(): string
    {
        return 'created_at';
    }

    public function label(): string
    {
        return 'Created';
    }

    public function value(Item $item): int
    {
        return $item->createdAt->getTimestamp();
    }
}
