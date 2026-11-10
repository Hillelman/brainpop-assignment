<?php

namespace App\Queries\Sorts;

use App\Domain\Entities\Item;
use App\Queries\Sorts\Contracts\Sort;
use App\Repositories\Contracts\UserRepository;
use Illuminate\Support\Collection;

class SubmitterSort implements Sort
{
    /** @var array<int, string> lowercased submitter names keyed by user id */
    private array $names = [];

    public function __construct(private readonly UserRepository $users) {}

    public function key(): string
    {
        return 'submitter';
    }

    public function label(): string
    {
        return 'Submitter';
    }

    public function prepare(Collection $items): void
    {
        $users = $this->users->findMany($items->pluck('submitterId')->unique()->values()->all());

        $this->names = array_map(fn ($user): string => mb_strtolower($user->name), $users);
    }

    public function value(Item $item): ?string
    {
        return $this->names[$item->submitterId] ?? null;
    }
}
