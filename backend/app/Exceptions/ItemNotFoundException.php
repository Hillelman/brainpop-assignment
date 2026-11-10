<?php

namespace App\Exceptions;

class ItemNotFoundException extends DomainException
{
    public function __construct(string $message = 'Item not found.')
    {
        parent::__construct($message, 'not_found', 404);
    }
}
