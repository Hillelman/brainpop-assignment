<?php

namespace App\Support;

final class PersonName
{
    /** Trims the name and collapses every run of whitespace into a single space. */
    public static function normalize(string $name): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', $name));
    }

    /** The case-insensitive identity of a name; accents are preserved. */
    public static function key(string $name): string
    {
        return mb_strtolower(self::normalize($name));
    }
}
