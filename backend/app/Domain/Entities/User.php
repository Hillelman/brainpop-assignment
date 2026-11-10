<?php

namespace App\Domain\Entities;

use Carbon\CarbonImmutable;

final readonly class User
{
    public function __construct(
        public int $id,
        public string $name,
        public CarbonImmutable $createdAt,
    ) {}

    /**
     * Legacy identity keys from older data files are ignored.
     *
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            id: (int) $data['id'],
            name: (string) $data['name'],
            createdAt: CarbonImmutable::parse((string) $data['created_at'])->utc(),
        );
    }

    /**
     * @return array{id: int, name: string, created_at: string}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'created_at' => $this->createdAt->utc()->toIso8601String(),
        ];
    }
}
