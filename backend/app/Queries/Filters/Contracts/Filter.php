<?php

namespace App\Queries\Filters\Contracts;

use App\Domain\Entities\Item;
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
    public function apply(Collection $items, mixed $value): Collection;

    /**
     * Date filters may set `group` and `group_label` so the UI lays related ranges out as one labelled row.
     *
     * @return array{key: string, label: string, type: 'select'|'date'|'text', options?: list<array{value: string, label: string}>, group?: string, group_label?: string}
     */
    public function meta(): array;
}
