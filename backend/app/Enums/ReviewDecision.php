<?php

namespace App\Enums;

enum ReviewDecision: string
{
    case Approved = 'approved';
    case Rejected = 'rejected';

    /** The item status that results from this decision. */
    public function toStatus(): ItemStatus
    {
        return match ($this) {
            self::Approved => ItemStatus::Approved,
            self::Rejected => ItemStatus::Rejected,
        };
    }
}
