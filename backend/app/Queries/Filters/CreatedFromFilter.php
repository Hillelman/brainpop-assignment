<?php

namespace App\Queries\Filters;

use App\Queries\Filters\Contracts\Filter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class CreatedFromFilter implements Filter
{
    public function key(): string
    {
        return 'created_from';
    }

    public function rules(): array
    {
        return ['nullable', 'date_format:Y-m-d'];
    }

    public function apply(Collection $items, mixed $value): Collection
    {
        $start = CarbonImmutable::parse((string) $value, 'UTC')->startOfDay();

        return $items->filter(fn ($item): bool => $item->createdAt->gte($start));
    }

    public function meta(): array
    {
        return [
            'key' => $this->key(),
            'label' => 'From',
            'type' => 'date',
            'group' => 'created_at',
            'group_label' => 'Created at',
        ];
    }
}
