<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ApiConfiguration;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __invoke(ApiConfiguration $configuration): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'checks' => [
                'storage_writable' => $configuration->storageWritable(),
            ],
        ]);
    }
}
