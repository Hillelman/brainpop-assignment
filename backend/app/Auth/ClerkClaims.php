<?php

namespace App\Auth;

final readonly class ClerkClaims
{
    public function __construct(
        public string $sub,
        public string $email,
        public string $name,
    ) {}
}
