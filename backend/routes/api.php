<?php

use App\Http\Controllers\Api\HealthController;
use App\Http\Middleware\EnsureAppConfigured;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::middleware(EnsureAppConfigured::class)->group(function (): void {
    // Item routes live in routes/api/items.php so item tasks never edit this file.
    require __DIR__.'/api/items.php';
});
