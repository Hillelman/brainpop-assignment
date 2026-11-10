<?php

namespace App\Exceptions;

class AppNotConfiguredException extends DomainException
{
    /**
     * @param  list<string>  $missing  names of the environment variables that are not set
     */
    public function __construct(public readonly array $missing = ['APP_KEY'])
    {
        parent::__construct('The application is not configured on the server.', 'app_not_configured', 503);
    }
}
