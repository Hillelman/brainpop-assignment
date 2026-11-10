<?php

namespace App\Queries\Filters;

use App\Queries\Filters\Contracts\Filter;
use App\Queries\Filters\Rules\NotBeforeFilter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class CreatedToFilter implements Filter
{
    public function key(): string
    {
        return 'created_to';
    }

    public function rules(): array
    {
        return ['nullable', 'date_format:Y-m-d', new NotBeforeFilter('created_from')];
    }

    public function apply(Collection $items, mixed $value): Collection
    {
        $end = CarbonImmutable::parse((string) $value, 'UTC')->endOfDay();

        return $items->filter(fn ($item): bool => $item->createdAt->lte($end));
    }

    public function meta(): array
    {
        return [
            'key' => $this->key(),
            'label' => 'To',
            'type' => 'date',
            'group' => 'created_at',
            'group_label' => 'Created at',
        ];
    }
}
