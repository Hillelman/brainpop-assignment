<?php

namespace App\Queries\Filters;

use App\Queries\Filters\Contracts\Filter;
use App\Queries\QueryContext;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class SubmitterFilter implements Filter
{
    public function key(): string
    {
        return 'submitter';
    }

    public function rules(): array
    {
        return ['nullable', 'string', Rule::in(['mine', 'everyone'])];
    }

    public function apply(Collection $items, mixed $value, QueryContext $ctx): Collection
    {
        if ($value !== 'mine') {
            return $items;
        }

        return $items->filter(fn ($item): bool => $item->submitterId === $ctx->user->id);
    }

    public function meta(): array
    {
        return [
            'key' => $this->key(),
            'label' => 'Submitter',
            'type' => 'select',
            'options' => [
                ['value' => 'everyone', 'label' => 'Everyone'],
                ['value' => 'mine', 'label' => 'Mine'],
            ],
        ];
    }
}
