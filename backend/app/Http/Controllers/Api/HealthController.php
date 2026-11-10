<?php

namespace App\Http\Controllers\Api;

use App\Auth\ApiConfiguration;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __invoke(ApiConfiguration $configuration): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'checks' => [
                'app_key' => $configuration->hasAppKey(),
                'clerk' => $configuration->hasClerk(),
                'storage_writable' => $configuration->storageWritable(),
            ],
        ]);
    }
}
