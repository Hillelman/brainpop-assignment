<?php

namespace App\Exceptions;

class AuthNotConfiguredException extends DomainException
{
    /**
     * @param  list<string>  $missing  names of the environment variables that are not set
     */
    public function __construct(public readonly array $missing)
    {
        parent::__construct('Authentication is not configured on the server.', 'auth_not_configured', 503);
    }
}
