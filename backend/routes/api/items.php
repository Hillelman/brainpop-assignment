<?php

use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\ItemFilterController;
use App\Http\Controllers\Api\ItemReviewController;
use App\Http\Controllers\Api\ItemReviewHistoryController;
use Illuminate\Support\Facades\Route;

// Item routes are registered here (inside the group in routes/api.php).
Route::get('/items', [ItemController::class, 'index']);
Route::get('/items/search', [ItemController::class, 'search']);
Route::get('/items/filters', ItemFilterController::class);
Route::post('/items', [ItemController::class, 'store']);
Route::get('/items/{item}', [ItemController::class, 'show'])->whereNumber('item');
Route::get('/items/{item}/reviews', ItemReviewHistoryController::class)->whereNumber('item');
Route::post('/items/reviews', [ItemReviewController::class, 'store']);
