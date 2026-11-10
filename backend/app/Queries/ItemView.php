<?php

namespace App\Queries;

use App\Domain\Entities\Item;
use App\Domain\Entities\User;

final readonly class ItemView
{
    public function __construct(
        public Item $item,
        public ?User $submitter,
        public ?ReviewView $latestReview,
    ) {}
}
