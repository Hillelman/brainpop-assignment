<?php

namespace App\Queries\Sorts;

use App\Domain\Entities\Item;
use App\Queries\Sorts\Contracts\Sort;

class RiskSort implements Sort
{
    public function key(): string
    {
        return 'risk';
    }

    public function label(): string
    {
        return 'Risk';
    }

    public function value(Item $item): ?int
    {
        return $item->risk?->weight();
    }
}
