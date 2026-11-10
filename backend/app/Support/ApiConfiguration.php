<?php

namespace App\Support;

use App\Exceptions\AppNotConfiguredException;
use Illuminate\Support\Facades\Log;

/**
 * Reports which required server settings are missing. Only variable names are ever exposed, never values.
 */
class ApiConfiguration
{
    public function hasAppKey(): bool
    {
        $key = config('app.key');

        return is_string($key) && trim($key) !== '';
    }

    public function storageWritable(): bool
    {
        $path = (string) config('storage_json.path');
        while ($path !== '' && ! file_exists($path) && dirname($path) !== $path) {
            $path = dirname($path);
        }

        return $path !== '' && is_dir($path) && is_writable($path);
    }

    /**
     * @throws AppNotConfiguredException
     */
    public function assertReady(): void
    {
        if (! $this->hasAppKey()) {
            Log::warning('Server configuration is missing required variables.', ['missing' => ['APP_KEY']]);

            throw new AppNotConfiguredException;
        }
    }
}
