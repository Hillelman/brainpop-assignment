<?php

namespace App\Auth;

use App\Exceptions\AppNotConfiguredException;
use App\Exceptions\AuthNotConfiguredException;
use Illuminate\Support\Facades\Log;

/**
 * Reports which required server settings are missing. Only variable names are ever exposed, never values.
 */
class ApiConfiguration
{
    public function hasAppKey(): bool
    {
        return $this->isSet(config('app.key'));
    }

    public function hasClerk(): bool
    {
        return $this->missingClerk() === [];
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
     * @return list<string>
     */
    public function missingClerk(): array
    {
        return $this->isSet(config('clerk.jwks_url')) ? [] : ['CLERK_JWKS_URL'];
    }

    /**
     * @throws AppNotConfiguredException
     * @throws AuthNotConfiguredException
     */
    public function assertReady(): void
    {
        if (! $this->hasAppKey()) {
            Log::warning('Server configuration is missing required variables.', ['missing' => ['APP_KEY']]);

            throw new AppNotConfiguredException;
        }

        $missing = $this->missingClerk();
        if ($missing !== []) {
            Log::warning('Server configuration is missing required variables.', ['missing' => $missing]);

            throw new AuthNotConfiguredException($missing);
        }
    }

    private function isSet(mixed $value): bool
    {
        return is_string($value) && trim($value) !== '';
    }
}
