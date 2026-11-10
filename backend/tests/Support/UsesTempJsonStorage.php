<?php

namespace Tests\Support;

use Illuminate\Support\Facades\File;

/**
 * Points `storage_json.path` at a fresh temp directory for each test and removes it afterwards.
 */
trait UsesTempJsonStorage
{
    protected string $jsonStoragePath;

    protected function setUpUsesTempJsonStorage(): void
    {
        $this->jsonStoragePath = sys_get_temp_dir().'/review-queue-'.bin2hex(random_bytes(8));
        config(['storage_json.path' => $this->jsonStoragePath]);
    }

    protected function tearDownUsesTempJsonStorage(): void
    {
        File::deleteDirectory($this->jsonStoragePath);
    }
}
