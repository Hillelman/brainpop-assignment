<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ItemNotFoundException;
use App\Http\Controllers\Controller;
use App\Http\Requests\ListItemsRequest;
use App\Http\Requests\SearchItemsRequest;
use App\Http\Requests\StoreItemRequest;
use App\Http\Resources\ItemResource;
use App\Queries\ItemQuery;
use App\Queries\ItemViewFactory;
use App\Repositories\Contracts\ItemRepository;
use App\Services\ItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ItemController extends Controller
{
    public function index(ListItemsRequest $request, ItemQuery $query): AnonymousResourceCollection
    {
        return ItemResource::collection($query->run($request->toParams()));
    }

    public function search(SearchItemsRequest $request, ItemQuery $query): AnonymousResourceCollection
    {
        return ItemResource::collection($query->run($request->toParams()));
    }

    public function show(int $item, ItemRepository $items, ItemViewFactory $views): ItemResource
    {
        $found = $items->find($item) ?? throw new ItemNotFoundException;

        return new ItemResource($views->items(collect([$found]))->first());
    }

    public function store(StoreItemRequest $request, ItemService $service, ItemViewFactory $views): JsonResponse
    {
        $created = $service->submit($request->submitterName(), $request->validated('title'), $request->validated('description'));

        return (new ItemResource($views->items(collect([$created]))->first()))
            ->response()
            ->setStatusCode(201);
    }
}
