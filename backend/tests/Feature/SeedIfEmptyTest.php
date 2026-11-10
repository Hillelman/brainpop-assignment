<?php

use Illuminate\Support\Facades\File;
use Tests\Support\UsesTempJsonStorage;

uses(UsesTempJsonStorage::class);

it('seeds when items.json is missing, creating the data directory', function () {
    $this->artisan('app:seed-json', ['--if-empty' => true, '--count' => 5])->assertSuccessful();

    expect(json_decode(File::get("{$this->jsonStoragePath}/items.json"), true))->toHaveCount(5);
});

it('seeds when items.json is an empty collection', function () {
    File::ensureDirectoryExists($this->jsonStoragePath);
    File::put("{$this->jsonStoragePath}/items.json", '[]');

    $this->artisan('app:seed-json', ['--if-empty' => true, '--count' => 3])->assertSuccessful();

    expect(json_decode(File::get("{$this->jsonStoragePath}/items.json"), true))->toHaveCount(3);
});

it('makes no changes when items exist', function () {
    $this->artisan('app:seed-json', ['--count' => 4])->assertSuccessful();
    $file = "{$this->jsonStoragePath}/items.json";
    touch($file, time() - 1000);
    clearstatcache();
    $mtime = filemtime($file);
    $contents = File::get($file);

    $this->artisan('app:seed-json', ['--if-empty' => true, '--count' => 9])->assertSuccessful();

    clearstatcache();
    expect(filemtime($file))->toBe($mtime)->and(File::get($file))->toBe($contents);
});
