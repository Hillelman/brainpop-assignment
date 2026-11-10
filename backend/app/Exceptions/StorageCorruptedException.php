<?php

namespace App\Exceptions;

use RuntimeException;
use Throwable;

class StorageCorruptedException extends RuntimeException
{
    public static function forFile(string $path, ?Throwable $previous = null): self
    {
        return new self("Storage file [{$path}] does not contain valid JSON data.", 0, $previous);
    }
}
