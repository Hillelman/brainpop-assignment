<?php

namespace App\DTOs;

use App\Enums\ReviewDecision;
use App\Enums\RiskLevel;

final readonly class BulkReviewData
{
    /**
     * @param  list<int>  $ids  unique, in request order
     */
    public function __construct(
        public array $ids,
        public ReviewDecision $decision,
        public ?RiskLevel $risk,
        public ?string $note,
    ) {}
}
