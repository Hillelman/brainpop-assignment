<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Base class for business-rule violations that map to a specific HTTP response.
 */
class DomainException extends RuntimeException
{
    public function __construct(
        string $message = 'The request conflicts with the current state.',
        public readonly string $errorCode = 'conflict',
        public readonly int $status = 409,
    ) {
        parent::__construct($message);
    }
}
