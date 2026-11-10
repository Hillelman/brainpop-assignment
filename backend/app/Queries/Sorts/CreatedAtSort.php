<?php

namespace App\Queries\Sorts;

use App\Domain\Entities\Item;
use App\Queries\Sorts\Contracts\Sort;
use Illuminate\Support\Collection;

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

    public function prepare(Collection $items): void {}

    public function value(Item $item): int
    {
        return $item->createdAt->getTimestamp();
    }
}
