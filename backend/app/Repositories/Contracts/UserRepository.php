<?php

namespace App\Repositories\Contracts;

use App\Domain\Entities\User;

interface UserRepository
{
    public function findByClerkId(string $clerkId): ?User;

    /** Creates the user on first sight, otherwise refreshes name and email. */
    public function upsertFromClerk(string $clerkId, string $name, string $email): User;

    /**
     * Unknown ids are ignored and duplicates collapsed.
     *
     * @param  list<int>  $ids
     * @return array<int, User> keyed by user id
     */
    public function findMany(array $ids): array;
}
