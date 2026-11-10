<?php

namespace Tests\Support;

use App\Auth\ClerkClaims;
use App\Auth\Contracts\TokenVerifier;
use Illuminate\Auth\AuthenticationException;

/**
 * Accepts tokens shaped "test-token:<clerkId>:<email>".
 */
class FakeTokenVerifier implements TokenVerifier
{
    public function verify(string $jwt): ClerkClaims
    {
        $parts = explode(':', $jwt, 3);
        if (count($parts) !== 3 || $parts[0] !== 'test-token' || $parts[1] === '') {
            throw new AuthenticationException('Invalid token.');
        }

        return new ClerkClaims(
            sub: $parts[1],
            email: $parts[2],
            name: $parts[2] !== '' ? $parts[2] : $parts[1],
        );
    }
}
