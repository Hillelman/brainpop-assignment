<?php

namespace App\Queries\Sorts;

use App\Domain\Entities\Item;
use App\Queries\Sorts\Contracts\Sort;

class TitleSort implements Sort
{
    public function key(): string
    {
        return 'title';
    }

    public function label(): string
    {
        return 'Title';
    }

    public function value(Item $item): string
    {
        return mb_strtolower($item->title);
    }
}
