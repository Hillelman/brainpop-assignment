<?php

namespace App\Http\Resources;

use App\Queries\ReviewView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property ReviewView $resource
 */
class ReviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $review = $this->resource->review;
        $reviewer = $this->resource->reviewer;

        return [
            'id' => $review->id,
            'decision' => $review->decision->value,
            'risk' => $review->risk?->value,
            'note' => $review->note,
            'reviewer' => ['id' => $review->reviewerId, 'name' => $reviewer->name ?? ''],
            'created_at' => $review->createdAt->utc()->toIso8601String(),
        ];
    }
}
