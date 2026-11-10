<?php

namespace App\Domain\Entities;

use Carbon\CarbonImmutable;

final readonly class User
{
    public function __construct(
        public int $id,
        public string $clerkId,
        public string $name,
        public string $email,
        public CarbonImmutable $createdAt,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            id: (int) $data['id'],
            clerkId: (string) $data['clerk_id'],
            name: (string) $data['name'],
            email: (string) $data['email'],
            createdAt: CarbonImmutable::parse((string) $data['created_at'])->utc(),
        );
    }

    /**
     * @return array{id: int, clerk_id: string, name: string, email: string, created_at: string}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'clerk_id' => $this->clerkId,
            'name' => $this->name,
            'email' => $this->email,
            'created_at' => $this->createdAt->utc()->toIso8601String(),
        ];
    }
}
