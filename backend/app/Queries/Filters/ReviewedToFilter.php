<?php

namespace App\Queries\Filters;

use App\Domain\Entities\Item;
use App\Queries\Filters\Contracts\Filter;
use App\Queries\Filters\Rules\NotBeforeFilter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class ReviewedToFilter implements Filter
{
    public function __construct(private readonly LatestReviewDates $dates) {}

    public function key(): string
    {
        return 'reviewed_to';
    }

    public function rules(): array
    {
        return ['nullable', 'date_format:Y-m-d', new NotBeforeFilter('reviewed_from')];
    }

    public function apply(Collection $items, mixed $value): Collection
    {
        $end = CarbonImmutable::parse((string) $value, 'UTC')->endOfDay();
        $dates = $this->dates->for($items);

        return $items->filter(fn (Item $item): bool => $dates[$item] !== null && $dates[$item]->lte($end));
    }

    public function meta(): array
    {
        return [
            'key' => $this->key(),
            'label' => 'To',
            'type' => 'date',
            'group' => 'reviewed_at',
            'group_label' => 'Reviewed at',
        ];
    }
}
