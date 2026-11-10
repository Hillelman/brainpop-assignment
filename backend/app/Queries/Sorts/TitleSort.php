<?php

namespace App\Queries\Sorts;

use App\Domain\Entities\Item;
use App\Queries\Sorts\Contracts\Sort;
use Illuminate\Support\Collection;

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

    public function prepare(Collection $items): void {}

    public function value(Item $item): string
    {
        return mb_strtolower($item->title);
    }
}
