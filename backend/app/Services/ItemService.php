<?php

namespace App\Services;

use App\Domain\Entities\Item;
use App\Domain\Entities\User;
use App\Enums\ItemStatus;
use App\Repositories\Contracts\ItemRepository;

class ItemService
{
    public function __construct(private readonly ItemRepository $items) {}

    /** Creates a pending item owned by the given user. */
    public function submit(User $user, string $title, string $description): Item
    {
        return $this->items->create([
            'title' => $title,
            'description' => $description,
            'submitter_id' => $user->id,
            'status' => ItemStatus::Pending,
        ]);
    }
}
