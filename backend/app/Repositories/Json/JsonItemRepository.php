<?php

namespace App\Repositories\Json;

use App\Domain\Entities\Item;
use App\Enums\ItemStatus;
use App\Enums\RiskLevel;
use App\Repositories\Contracts\ItemRepository;
use App\Storage\CollectionTransaction;
use App\Storage\JsonStore;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final class JsonItemRepository implements ItemRepository
{
    private const COLLECTION = 'items';

    public function __construct(private readonly JsonStore $store) {}

    public function all(): Collection
    {
        return collect($this->store->read(self::COLLECTION))
            ->map(fn (array $record): Item => Item::fromArray($record));
    }

    public function find(int $id): ?Item
    {
        foreach ($this->store->read(self::COLLECTION) as $record) {
            if ($record['id'] === $id) {
                return Item::fromArray($record);
            }
        }

        return null;
    }

    public function findMany(array $ids): array
    {
        $wanted = array_flip($ids);
        $items = [];
        foreach ($this->store->read(self::COLLECTION) as $record) {
            if (isset($wanted[$record['id']])) {
                $items[(int) $record['id']] = Item::fromArray($record);
            }
        }

        return $items;
    }

    public function create(array $attributes): Item
    {
        $now = CarbonImmutable::now('UTC');
        $status = $attributes['status'] ?? ItemStatus::Pending;
        $risk = $attributes['risk'] ?? null;
        $createdAt = $attributes['created_at'] ?? $now;

        return $this->store->transaction(self::COLLECTION, fn (CollectionTransaction $tx): Item => Item::fromArray($tx->insert([
            'title' => $attributes['title'],
            'description' => $attributes['description'],
            'submitter_id' => $attributes['submitter_id'],
            'status' => $status instanceof ItemStatus ? $status->value : $status,
            'risk' => $risk instanceof RiskLevel ? $risk->value : $risk,
            'created_at' => CarbonImmutable::parse($createdAt)->utc()->toIso8601String(),
            'updated_at' => CarbonImmutable::parse($attributes['updated_at'] ?? $createdAt)->utc()->toIso8601String(),
        ])));
    }

    public function transaction(callable $callback): mixed
    {
        return $this->store->transaction(self::COLLECTION, fn (): mixed => $callback());
    }

    public function updateMany(array $items): void
    {
        $this->store->transaction(self::COLLECTION, function (CollectionTransaction $tx) use ($items): void {
            foreach ($items as $item) {
                $tx->replace($item->toArray());
            }
        });
    }
}
