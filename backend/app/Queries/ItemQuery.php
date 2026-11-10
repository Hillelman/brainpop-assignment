<?php

namespace App\Queries;

use App\Domain\Entities\Item;
use App\Repositories\Contracts\ItemRepository;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class ItemQuery
{
    public function __construct(
        private readonly ItemRepository $items,
        private readonly FilterRegistry $filters,
        private readonly SortRegistry $sorts,
        private readonly ItemViewFactory $views,
    ) {}

    /**
     * Applies state, search, filters and sort (in that order) then paginates.
     *
     * @return LengthAwarePaginator<int, ItemView>
     */
    public function run(ItemQueryParams $params): LengthAwarePaginator
    {
        $items = $params->state->apply($this->items->all());
        $items = $this->search($items, $params->search);

        foreach ($params->filters as $key => $value) {
            $filter = $this->filters->get($key);
            if ($filter !== null && $value !== null && $value !== '') {
                $items = $filter->apply($items, $value);
            }
        }

        $items = $this->sort($items, $params->sort);

        $page = $items->forPage($params->page, $params->perPage);

        return new LengthAwarePaginator(
            $this->views->items($page),
            $items->count(),
            $params->perPage,
            $params->page,
            ['path' => LengthAwarePaginator::resolveCurrentPath()],
        );
    }

    /**
     * @param  Collection<int, Item>  $items
     * @return Collection<int, Item>
     */
    private function search(Collection $items, ?string $search): Collection
    {
        $needle = mb_strtolower(trim((string) $search));
        if ($needle === '') {
            return $items;
        }

        return $items->filter(
            fn (Item $item): bool => str_contains(mb_strtolower($item->title), $needle)
                || str_contains(mb_strtolower($item->description), $needle),
        );
    }

    /**
     * @param  Collection<int, Item>  $items
     * @return Collection<int, Item>
     */
    private function sort(Collection $items, string $sort): Collection
    {
        $descending = str_starts_with($sort, '-');
        $strategy = $this->sorts->get(ltrim($sort, '-'));
        if ($strategy === null) {
            return $items;
        }
        $direction = $descending ? -1 : 1;
        $strategy->prepare($items);

        return $items->sort(function (Item $a, Item $b) use ($strategy, $direction): int {
            $left = $strategy->value($a);
            $right = $strategy->value($b);

            if ($left === null || $right === null) {
                if ($left !== $right) {
                    return $left === null ? 1 : -1;
                }

                return $direction * ($a->id <=> $b->id);
            }

            $order = is_string($left) ? strcmp($left, (string) $right) : $left <=> $right;

            return $direction * ($order ?: ($a->id <=> $b->id));
        })->values();
    }
}
