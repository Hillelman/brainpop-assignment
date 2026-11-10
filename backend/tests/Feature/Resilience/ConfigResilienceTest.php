<?php

use Tests\Support\UsesTempJsonStorage;

uses(UsesTempJsonStorage::class);

it('serves the API when app.key is empty', function () {
    config(['app.key' => '']);
    $this->app->forgetInstance('encrypter');

    $this->getJson('/api/items')->assertOk();
});

it('serves the API in a subprocess with an empty environment and no .env file', function () {
    $emptyEnvDir = sys_get_temp_dir().'/review-queue-empty-env-dir-'.uniqid();
    mkdir($emptyEnvDir);

    $script = '$app = require "bootstrap/app.php";'
        .'$app->useEnvironmentPath('.var_export($emptyEnvDir, true).');'
        .'$response = $app->make(Illuminate\\Contracts\\Http\\Kernel::class)->handle(Illuminate\\Http\\Request::create("/api/items", "GET", server: ["HTTP_ACCEPT" => "application/json"]));'
        .'echo $response->getStatusCode();';
    $process = proc_open(
        [PHP_BINARY, '-d', 'display_errors=0', '-r', 'require "vendor/autoload.php";'.$script],
        [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes,
        base_path(),
        ['PATH' => (string) getenv('PATH'), 'HOME' => sys_get_temp_dir(), 'JSON_STORAGE_PATH' => sys_get_temp_dir().'/review-queue-empty-env-test'],
    );
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    proc_close($process);
    rmdir($emptyEnvDir);

    expect($stdout)->toBe('200', $stderr);
});
