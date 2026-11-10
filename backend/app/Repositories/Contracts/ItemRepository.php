<?php

namespace App\Repositories\Contracts;

use App\Domain\Entities\Item;
use Illuminate\Support\Collection;

interface ItemRepository
{
    /**
     * @return Collection<int, Item>
     */
    public function all(): Collection;

    public function find(int $id): ?Item;

    /**
     * Unknown ids are ignored and duplicates collapsed.
     *
     * @param  list<int>  $ids
     * @return array<int, Item> keyed by item id
     */
    public function findMany(array $ids): array;

    /**
     * Creates an item. Required keys: title, description, submitter_id. Optional: status (default
     * pending), risk, created_at, updated_at (default now).
     *
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): Item;

    /**
     * Runs the callback under an exclusive lock so reads and {@see self::updateMany()} inside it are atomic.
     *
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    public function transaction(callable $callback): mixed;

    /**
     * Persists the given items, replacing the stored ones with the same id.
     *
     * @param  array<int, Item>  $items
     */
    public function updateMany(array $items): void;
}
