<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkReviewRequest;
use App\Http\Resources\ItemResource;
use App\Queries\ItemViewFactory;
use App\Services\ReviewService;
use Illuminate\Http\JsonResponse;

class ItemReviewController extends Controller
{
    public function store(BulkReviewRequest $request, ReviewService $service, ItemViewFactory $views): JsonResponse
    {
        $result = $service->bulkReview($request->toData(), $request->user());

        return response()->json([
            'data' => [
                'updated' => ItemResource::collection($views->items(collect($result->updated)))->resolve(),
                'failed' => $result->failed,
            ],
            'meta' => [
                'updated_count' => count($result->updated),
                'failed_count' => count($result->failed),
            ],
        ]);
    }
}
