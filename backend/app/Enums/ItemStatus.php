<?php

namespace App\Enums;

enum ItemStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';

    /** Whether a reviewer has already made a decision on the item. */
    public function isReviewed(): bool
    {
        return $this !== self::Pending;
    }

    /** Numeric weight used for sorting (pending first, then approved, then rejected). */
    public function sortWeight(): int
    {
        return match ($this) {
            self::Pending => 1,
            self::Approved => 2,
            self::Rejected => 3,
        };
    }
}
