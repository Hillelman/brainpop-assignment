<?php

namespace App\Repositories\Json;

use App\Domain\Entities\User;
use App\Repositories\Contracts\UserRepository;
use App\Storage\CollectionTransaction;
use App\Storage\JsonStore;
use App\Support\PersonName;
use Carbon\CarbonImmutable;

final class JsonUserRepository implements UserRepository
{
    private const COLLECTION = 'users';

    public function __construct(private readonly JsonStore $store) {}

    public function findOrCreateByName(string $name): User
    {
        $key = PersonName::key($name);

        return $this->store->transaction(self::COLLECTION, function (CollectionTransaction $tx) use ($name, $key): User {
            foreach ($tx->records() as $record) {
                if (PersonName::key((string) $record['name']) === $key) {
                    return User::fromArray($record);
                }
            }

            return User::fromArray($tx->insert([
                'name' => PersonName::normalize($name),
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
