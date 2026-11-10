<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Queries\FilterRegistry;
use App\Queries\SortRegistry;
use App\Queries\Sorts\Contracts\Sort;
use Illuminate\Http\JsonResponse;

class ItemFilterController extends Controller
{
    public function __invoke(FilterRegistry $filters, SortRegistry $sorts): JsonResponse
    {
        return response()->json([
            'filters' => array_values(array_map(fn ($filter): array => $filter->meta(), $filters->all())),
            'sorts' => array_values(array_map(
                fn (Sort $sort): array => ['key' => $sort->key(), 'label' => $sort->label()],
                $sorts->all(),
            )),
        ]);
    }
}
