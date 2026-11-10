<?php

namespace App\Queries\Filters;

use App\Domain\Entities\Item;
use App\Queries\Filters\Contracts\Filter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class ReviewedFromFilter implements Filter
{
    public function __construct(private readonly LatestReviewDates $dates) {}

    public function key(): string
    {
        return 'reviewed_from';
    }

    public function rules(): array
    {
        return ['nullable', 'date_format:Y-m-d'];
    }

    public function apply(Collection $items, mixed $value): Collection
    {
        $start = CarbonImmutable::parse((string) $value, 'UTC')->startOfDay();
        $dates = $this->dates->for($items);

        return $items->filter(fn (Item $item): bool => $dates[$item] !== null && $dates[$item]->gte($start));
    }

    public function meta(): array
    {
        return [
            'key' => $this->key(),
            'label' => 'From',
            'type' => 'date',
            'group' => 'reviewed_at',
            'group_label' => 'Reviewed at',
        ];
    }
}
