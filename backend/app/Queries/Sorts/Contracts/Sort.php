<?php

namespace App\Queries\Sorts\Contracts;

use App\Domain\Entities\Item;

interface Sort
{
    /** The `sort` param value (prefix with `-` for descending). */
    public function key(): string;

    public function label(): string;

    /** The comparable value of an item; null values always sort last. */
    public function value(Item $item): int|string|null;
}
