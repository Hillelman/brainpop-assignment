<?php

namespace App\Queries\Sorts\Contracts;

use App\Domain\Entities\Item;
use Illuminate\Support\Collection;

interface Sort
{
    /** The `sort` param value (prefix with `-` for descending). */
    public function key(): string;

    public function label(): string;

    /**
     * Called once per query with every item about to be sorted, before any `value()` call.
     * Sorts that need related data load it here in bulk instead of once per item.
     *
     * @param  Collection<int, Item>  $items
     */
    public function prepare(Collection $items): void;

    /** The comparable value of an item; null values always sort last. */
    public function value(Item $item): int|string|null;
}
