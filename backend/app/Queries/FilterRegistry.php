<?php

namespace App\Queries;

use App\Queries\Filters\Contracts\Filter;
use Illuminate\Contracts\Container\Container;

class FilterRegistry
{
    /** @var array<string, Filter> */
    private array $filters = [];

    public function __construct(Container $container)
    {
        foreach ((array) config('item_query.filters', []) as $class) {
            $filter = $container->make($class);
            $this->filters[$filter->key()] = $filter;
        }
    }

    /**
     * @return array<string, Filter> keyed by filter key
     */
    public function all(): array
    {
        return $this->filters;
    }

    public function get(string $key): ?Filter
    {
        return $this->filters[$key] ?? null;
    }
}
