<?php

use App\Http\Controllers\Api\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

// Item routes live in routes/api/items.php so item tasks never edit this file.
require __DIR__.'/api/items.php';
