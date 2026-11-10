<?php

namespace App\Queries\Filters;

use App\Enums\ItemStatus;
use App\Queries\Filters\Contracts\Filter;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class StatusFilter implements Filter
{
    public function key(): string
    {
        return 'status';
    }

    public function rules(): array
    {
        return ['nullable', 'string', Rule::enum(ItemStatus::class)];
    }

    public function apply(Collection $items, mixed $value): Collection
    {
        return $items->filter(fn ($item): bool => $item->status->value === $value);
    }

    public function meta(): array
    {
        return [
            'key' => $this->key(),
            'label' => 'Status',
            'type' => 'select',
            'options' => array_map(
                fn (ItemStatus $s): array => ['value' => $s->value, 'label' => ucfirst($s->value)],
                ItemStatus::cases(),
            ),
        ];
    }
}
