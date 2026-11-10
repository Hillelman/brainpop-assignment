<?php

namespace App\Queries;

use App\Domain\Entities\Review;
use App\Domain\Entities\User;

final readonly class ReviewView
{
    public function __construct(
        public Review $review,
        public ?User $reviewer,
    ) {}
}
