<?php

namespace App\Http\Middleware;

use App\Auth\Contracts\TokenVerifier;
use App\Repositories\Contracts\UserRepository;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateWithClerk
{
    public function __construct(
        private readonly TokenVerifier $verifier,
        private readonly UserRepository $users,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if ($token === null || $token === '') {
            throw new AuthenticationException('Unauthenticated.');
        }

        $claims = $this->verifier->verify($token);
        $user = $this->users->upsertFromClerk($claims->sub, $claims->name, $claims->email);

        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
