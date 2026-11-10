<?php

namespace App\Queries;

use App\Queries\Sorts\Contracts\Sort;
use Illuminate\Contracts\Container\Container;

class SortRegistry
{
    /** @var array<string, Sort> */
    private array $sorts = [];

    public function __construct(Container $container)
    {
        foreach ((array) config('item_query.sorts', []) as $class) {
            $sort = $container->make($class);
            $this->sorts[$sort->key()] = $sort;
        }
    }

    /**
     * @return array<string, Sort> keyed by sort key
     */
    public function all(): array
    {
        return $this->sorts;
    }

    public function get(string $key): ?Sort
    {
        return $this->sorts[$key] ?? null;
    }
}
