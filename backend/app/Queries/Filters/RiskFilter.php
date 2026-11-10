<?php

namespace App\Queries\Filters;

use App\Enums\RiskLevel;
use App\Queries\Filters\Contracts\Filter;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class RiskFilter implements Filter
{
    private const NONE = 'none';

    public function key(): string
    {
        return 'risk';
    }

    public function rules(): array
    {
        return ['nullable', 'string', Rule::in($this->values())];
    }

    public function apply(Collection $items, mixed $value): Collection
    {
        return $items->filter(fn ($item): bool => ($item->risk?->value ?? self::NONE) === $value);
    }

    public function meta(): array
    {
        return [
            'key' => $this->key(),
            'label' => 'Risk',
            'type' => 'select',
            'options' => array_map(fn (string $v): array => ['value' => $v, 'label' => ucfirst($v)], $this->values()),
        ];
    }

    /**
     * @return list<string>
     */
    private function values(): array
    {
        return [...array_map(fn (RiskLevel $r): string => $r->value, RiskLevel::cases()), self::NONE];
    }
}
