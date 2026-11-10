<?php

namespace App\Http\Controllers\Api;

use App\Domain\Entities\Review;
use App\Exceptions\ItemNotFoundException;
use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Queries\ItemViewFactory;
use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\ReviewRepository;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class ItemReviewHistoryController extends Controller
{
    public function __invoke(
        Request $request,
        int $item,
        ItemRepository $items,
        ReviewRepository $reviews,
        ItemViewFactory $views,
    ): AnonymousResourceCollection {
        $params = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        if ($items->find($item) === null) {
            throw new ItemNotFoundException;
        }

        $page = (int) ($params['page'] ?? 1);
        $perPage = (int) ($params['per_page'] ?? 15);

        /** @var Collection<int, Review> $history */
        $history = $reviews->forItem($item)->reverse()->values();

        return ReviewResource::collection(new LengthAwarePaginator(
            $views->reviews($history->forPage($page, $perPage)),
            $history->count(),
            $perPage,
            $page,
            ['path' => LengthAwarePaginator::resolveCurrentPath()],
        ));
    }
}
