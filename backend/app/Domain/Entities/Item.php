<?php

namespace App\Domain\Entities;

use App\Enums\ItemStatus;
use App\Enums\ReviewDecision;
use App\Enums\RiskLevel;
use Carbon\CarbonImmutable;

final readonly class Item
{
    public function __construct(
        public int $id,
        public string $title,
        public string $description,
        public int $submitterId,
        public ItemStatus $status,
        public ?RiskLevel $risk,
        public CarbonImmutable $createdAt,
        public CarbonImmutable $updatedAt,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        $risk = $data['risk'] ?? null;

        return new self(
            id: (int) $data['id'],
            title: (string) $data['title'],
            description: (string) $data['description'],
            submitterId: (int) $data['submitter_id'],
            status: ItemStatus::from((string) $data['status']),
            risk: $risk === null ? null : RiskLevel::from((string) $risk),
            createdAt: CarbonImmutable::parse((string) $data['created_at'])->utc(),
            updatedAt: CarbonImmutable::parse((string) $data['updated_at'])->utc(),
        );
    }

    /**
     * @return array{id: int, title: string, description: string, submitter_id: int, status: string, risk: string|null, created_at: string, updated_at: string}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'submitter_id' => $this->submitterId,
            'status' => $this->status->value,
            'risk' => $this->risk?->value,
            'created_at' => $this->createdAt->utc()->toIso8601String(),
            'updated_at' => $this->updatedAt->utc()->toIso8601String(),
        ];
    }

    /** Returns a copy with the review decision applied. */
    public function withReview(ReviewDecision $decision, ?RiskLevel $risk, CarbonImmutable $at): self
    {
        return new self(
            id: $this->id,
            title: $this->title,
            description: $this->description,
            submitterId: $this->submitterId,
            status: $decision->toStatus(),
            risk: $risk,
            createdAt: $this->createdAt,
            updatedAt: $at->utc(),
        );
    }
}
