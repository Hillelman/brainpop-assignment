<?php

namespace App\Domain\Entities;

use App\Enums\ReviewDecision;
use App\Enums\RiskLevel;
use Carbon\CarbonImmutable;

final readonly class Review
{
    public function __construct(
        public int $id,
        public int $itemId,
        public int $reviewerId,
        public ReviewDecision $decision,
        public ?RiskLevel $risk,
        public ?string $note,
        public CarbonImmutable $createdAt,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        $risk = $data['risk'] ?? null;
        $note = $data['note'] ?? null;

        return new self(
            id: (int) $data['id'],
            itemId: (int) $data['item_id'],
            reviewerId: (int) $data['reviewer_id'],
            decision: ReviewDecision::from((string) $data['decision']),
            risk: $risk === null ? null : RiskLevel::from((string) $risk),
            note: $note === null ? null : (string) $note,
            createdAt: CarbonImmutable::parse((string) $data['created_at'])->utc(),
        );
    }

    /**
     * @return array{id: int, item_id: int, reviewer_id: int, decision: string, risk: string|null, note: string|null, created_at: string}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'item_id' => $this->itemId,
            'reviewer_id' => $this->reviewerId,
            'decision' => $this->decision->value,
            'risk' => $this->risk?->value,
            'note' => $this->note,
            'created_at' => $this->createdAt->utc()->toIso8601String(),
        ];
    }
}
