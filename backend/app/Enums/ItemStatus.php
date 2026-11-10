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
}
