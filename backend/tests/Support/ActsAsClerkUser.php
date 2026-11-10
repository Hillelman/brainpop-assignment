<?php

namespace Tests\Support;

use App\Auth\Contracts\TokenVerifier;

/**
 * Swaps in the fake token verifier and authenticates requests as a Clerk user.
 */
trait ActsAsClerkUser
{
    protected function actingAsClerk(string $clerkId = 'user_test', ?string $email = null): static
    {
        $this->app->bind(TokenVerifier::class, FakeTokenVerifier::class);

        return $this->withHeader('Authorization', 'Bearer test-token:'.$clerkId.':'.($email ?? $clerkId.'@example.com'));
    }
}
