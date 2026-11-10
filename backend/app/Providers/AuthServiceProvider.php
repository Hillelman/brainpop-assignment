<?php

namespace App\Providers;

use App\Auth\ClerkJwksTokenVerifier;
use App\Auth\Contracts\TokenVerifier;
use Illuminate\Support\ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(TokenVerifier::class, ClerkJwksTokenVerifier::class);
    }
}
