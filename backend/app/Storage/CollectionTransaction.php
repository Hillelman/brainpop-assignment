<?php

namespace App\Storage;

/**
 * Mutable view of one collection handed to a {@see JsonStore::transaction()} mutator.
 *
 * @phpstan-type Record array<string, mixed>
 */
final class CollectionTransaction
{
    /**
     * @param  list<array<string, mixed>>  $records
     */
    public function __construct(private array $records) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function records(): array
    {
        return $this->records;
    }

    /**
     * Appends a record, assigning the next auto-increment id.
     *
     * @param  array<string, mixed>  $record
     * @return array<string, mixed> the stored record including its id
     */
    public function insert(array $record): array
    {
        $record = ['id' => $this->nextId()] + $record;
        $this->records[] = $record;

        return $record;
    }

    /**
     * Replaces the record with the same id; unknown ids are ignored.
     *
     * @param  array<string, mixed>  $record
     */
    public function replace(array $record): void
    {
        foreach ($this->records as $index => $existing) {
            if ($existing['id'] === $record['id']) {
                $this->records[$index] = $record;

                return;
            }
        }
    }

    private function nextId(): int
    {
        $max = 0;
        foreach ($this->records as $record) {
            $max = max($max, (int) $record['id']);
        }

        return $max + 1;
    }
}
