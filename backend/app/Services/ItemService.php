<?php

namespace App\Services;

use App\Domain\Entities\Item;
use App\Enums\ItemStatus;
use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\UserRepository;

class ItemService
{
    public function __construct(
        private readonly ItemRepository $items,
        private readonly UserRepository $users,
    ) {}

    /** Creates a pending item owned by the person with the given name, creating that person on first sight. */
    public function submit(string $submitterName, string $title, string $description): Item
    {
        $submitter = $this->users->findOrCreateByName($submitterName);

        return $this->items->create([
            'title' => $title,
            'description' => $description,
            'submitter_id' => $submitter->id,
            'status' => ItemStatus::Pending,
        ]);
    }
}
