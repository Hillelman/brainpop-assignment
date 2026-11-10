<?php

namespace App\Repositories\Contracts;

use App\Domain\Entities\User;

interface UserRepository
{
    /** Finds the user whose name matches case-insensitively after whitespace normalization, creating it on first sight. */
    public function findOrCreateByName(string $name): User;

    /**
     * Unknown ids are ignored and duplicates collapsed.
     *
     * @param  list<int>  $ids
     * @return array<int, User> keyed by user id
     */
    public function findMany(array $ids): array;
}
