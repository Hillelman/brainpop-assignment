<?php

namespace App\Repositories\Json;

use App\Domain\Entities\User;
use App\Repositories\Contracts\UserRepository;
use App\Storage\CollectionTransaction;
use App\Storage\JsonStore;
use Carbon\CarbonImmutable;

final class JsonUserRepository implements UserRepository
{
    private const COLLECTION = 'users';

    public function __construct(private readonly JsonStore $store) {}

    public function findByClerkId(string $clerkId): ?User
    {
        foreach ($this->store->read(self::COLLECTION) as $record) {
            if ($record['clerk_id'] === $clerkId) {
                return User::fromArray($record);
            }
        }

        return null;
    }

    public function upsertFromClerk(string $clerkId, string $name, string $email): User
    {
        $existing = $this->findByClerkId($clerkId);
        if ($existing?->name === $name && $existing->email === $email) {
            return $existing;
        }

        return $this->store->transaction(self::COLLECTION, function (CollectionTransaction $tx) use ($clerkId, $name, $email): User {
            foreach ($tx->records() as $record) {
                if ($record['clerk_id'] === $clerkId) {
                    $user = User::fromArray(['name' => $name, 'email' => $email] + $record);
                    $tx->replace($user->toArray());

                    return $user;
                }
            }

            return User::fromArray($tx->insert([
                'clerk_id' => $clerkId,
                'name' => $name,
                'email' => $email,
                'created_at' => CarbonImmutable::now('UTC')->toIso8601String(),
            ]));
        });
    }

    public function findMany(array $ids): array
    {
        $wanted = array_flip($ids);
        $users = [];
        foreach ($this->store->read(self::COLLECTION) as $record) {
            if (isset($wanted[$record['id']])) {
                $users[(int) $record['id']] = User::fromArray($record);
            }
        }

        return $users;
    }
}
