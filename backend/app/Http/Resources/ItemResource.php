<?php

namespace App\Http\Resources;

use App\Queries\ItemView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property ItemView $resource
 */
class ItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $item = $this->resource->item;

        return [
            'id' => $item->id,
            'title' => $item->title,
            'description' => $item->description,
            'status' => $item->status->value,
            'risk' => $item->risk?->value,
            'submitter' => ['id' => $item->submitterId, 'name' => $this->resource->submitter->name ?? ''],
            'created_at' => $item->createdAt->utc()->toIso8601String(),
            'updated_at' => $item->updatedAt->utc()->toIso8601String(),
            'latest_review' => $this->resource->latestReview === null ? null : new ReviewResource($this->resource->latestReview),
        ];
    }
}
