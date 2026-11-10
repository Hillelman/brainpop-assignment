<?php

namespace App\Queries\Sorts;

use App\Domain\Entities\Item;
use App\Queries\Sorts\Contracts\Sort;
use Illuminate\Support\Collection;

class StatusSort implements Sort
{
    public function key(): string
    {
        return 'status';
    }

    public function label(): string
    {
        return 'Status';
    }

    public function prepare(Collection $items): void {}

    public function value(Item $item): int
    {
        return $item->status->sortWeight();
    }
}
