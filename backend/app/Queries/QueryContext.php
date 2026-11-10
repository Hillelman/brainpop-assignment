<?php

namespace App\Queries;

use App\Domain\Entities\User;

final readonly class QueryContext
{
    public function __construct(public User $user) {}
}
