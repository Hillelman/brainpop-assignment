<?php

namespace App\Queries\Filters\Contracts;

use App\Domain\Entities\Item;
use App\Queries\QueryContext;
use Illuminate\Support\Collection;

interface Filter
{
    /** The query-string key: `filter[<key>]=...`. */
    public function key(): string;

    /**
     * Validation rules for this filter's value.
     *
     * @return array<int, mixed>
     */
    public function rules(): array;

    /**
     * @param  Collection<int, Item>  $items
     * @return Collection<int, Item>
     */
    public function apply(Collection $items, mixed $value, QueryContext $ctx): Collection;

    /**
     * @return array{key: string, label: string, type: 'select'|'date'|'text', options?: list<array{value: string, label: string}>}
     */
    public function meta(): array;
}
