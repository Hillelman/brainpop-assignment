<?php

namespace App\Auth\Contracts;

use App\Auth\ClerkClaims;
use Illuminate\Auth\AuthenticationException;

interface TokenVerifier
{
    /**
     * @throws AuthenticationException when the token cannot be verified
     */
    public function verify(string $jwt): ClerkClaims;
}
