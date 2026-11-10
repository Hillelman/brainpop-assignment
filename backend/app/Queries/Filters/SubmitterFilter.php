<?php

namespace App\Queries\Filters;

use App\Domain\Entities\User;
use App\Queries\Filters\Contracts\Filter;
use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\UserRepository;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class SubmitterFilter implements Filter
{
    public function __construct(
        private readonly ItemRepository $items,
        private readonly UserRepository $users,
    ) {}

    public function key(): string
    {
        return 'submitter';
    }

    public function rules(): array
    {
        return ['nullable', 'string', Rule::in(array_column($this->options(), 'value'))];
    }

    public function apply(Collection $items, mixed $value): Collection
    {
        return $items->filter(fn ($item): bool => (string) $item->submitterId === $value);
    }

    public function meta(): array
    {
        return [
            'key' => $this->key(),
            'label' => 'Submitter',
            'type' => 'select',
            'options' => $this->options(),
        ];
    }

    /**
     * People with at least one item, sorted by name.
     *
     * @return list<array{value: string, label: string}>
     */
    private function options(): array
    {
        $ids = $this->items->all()->pluck('submitterId')->unique()->values()->all();
        $people = array_values($this->users->findMany($ids));
        usort($people, fn (User $a, User $b): int => [mb_strtolower($a->name), $a->id] <=> [mb_strtolower($b->name), $b->id]);

        return array_map(fn (User $u): array => ['value' => (string) $u->id, 'label' => $u->name], $people);
    }
}
