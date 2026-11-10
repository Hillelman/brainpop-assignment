<?php

namespace App\DTOs;

use App\Domain\Entities\Item;

final readonly class BulkReviewResult
{
    /**
     * @param  list<Item>  $updated
     * @param  list<array{id: int, reason: string}>  $failed
     */
    public function __construct(
        public array $updated,
        public array $failed,
    ) {}
}
