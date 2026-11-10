<?php

use App\Http\Controllers\Api\MeController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::middleware('auth.clerk')->group(function (): void {
    Route::get('/me', MeController::class);

    // Item routes live in routes/api/items.php so item tasks never edit this file.
    require __DIR__.'/api/items.php';
});
