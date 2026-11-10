<?php

namespace App\Http\Middleware;

use App\Support\ApiConfiguration;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAppConfigured
{
    public function __construct(private readonly ApiConfiguration $configuration) {}

    public function handle(Request $request, Closure $next): Response
    {
        $this->configuration->assertReady();

        return $next($request);
    }
}
