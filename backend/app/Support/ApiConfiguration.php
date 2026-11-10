<?php

namespace App\Support;

class ApiConfiguration
{
    public function storageWritable(): bool
    {
        $path = (string) config('storage_json.path');
        while ($path !== '' && ! file_exists($path) && dirname($path) !== $path) {
            $path = dirname($path);
        }

        return $path !== '' && is_dir($path) && is_writable($path);
    }
}
