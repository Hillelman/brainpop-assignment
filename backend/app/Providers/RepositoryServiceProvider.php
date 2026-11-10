<?php

namespace App\Providers;

use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Contracts\UserRepository;
use App\Repositories\Json\JsonItemRepository;
use App\Repositories\Json\JsonReviewRepository;
use App\Repositories\Json\JsonUserRepository;
use App\Storage\JsonStore;
use Illuminate\Support\ServiceProvider;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->scoped(JsonStore::class, fn (): JsonStore => new JsonStore((string) config('storage_json.path')));
        $this->app->scoped(UserRepository::class, JsonUserRepository::class);
        $this->app->scoped(ItemRepository::class, JsonItemRepository::class);
        $this->app->scoped(ReviewRepository::class, JsonReviewRepository::class);
    }
}
