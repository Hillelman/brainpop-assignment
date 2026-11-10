<?php

namespace App\Queries;

final readonly class ItemQueryParams
{
    /**
     * @param  array<string, mixed>  $filters  filter values keyed by filter key (empty values already dropped)
     */
    public function __construct(
        public StateScope $state = StateScope::All,
        public ?string $search = null,
        public array $filters = [],
        public string $sort = '-created_at',
        public int $page = 1,
        public int $perPage = 15,
    ) {}
}
