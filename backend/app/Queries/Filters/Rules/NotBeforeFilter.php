<?php

namespace App\Queries\Filters\Rules;

use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Arr;
use Throwable;

/**
 * Fails when the validated date is earlier than another filter's date.
 */
class NotBeforeFilter implements DataAwareRule, ValidationRule
{
    /** @var array<string, mixed> */
    private array $data = [];

    public function __construct(private readonly string $otherKey) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $other = Arr::get($this->data, 'filter.'.$this->otherKey);
        if (! is_string($value) || ! is_string($other)) {
            return;
        }

        try {
            $before = CarbonImmutable::parse($value)->lt(CarbonImmutable::parse($other));
        } catch (Throwable) {
            return;
        }

        if ($before) {
            $fail("The {$attribute} must not be earlier than {$this->otherKey}.");
        }
    }
}
