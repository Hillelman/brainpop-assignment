<?php

use Tests\Support\UsesTempJsonStorage;

uses(UsesTempJsonStorage::class);

it('returns 503 app_not_configured as JSON when APP_KEY is missing', function () {
    config(['app.key' => '']);
    $this->app->forgetInstance('encrypter');

    $this->getJson('/api/items')
        ->assertStatus(503)
        ->assertJsonPath('code', 'app_not_configured')
        ->assertJsonPath('errors.missing', ['APP_KEY']);
});

it('reports false health checks when configuration is missing', function () {
    config(['app.key' => '', 'storage_json.path' => '/proc/nonexistent/dir']);

    $this->getJson('/api/health')->assertOk()->assertExactJson(['status' => 'ok', 'checks' => [
        'app_key' => false, 'storage_writable' => false,
    ]]);
});

it('boots with an empty environment', function () {
    $env = ['PATH' => (string) getenv('PATH'), 'HOME' => sys_get_temp_dir(), 'APP_ENV' => 'testing'];
    $process = proc_open(
        [PHP_BINARY, 'artisan', 'route:list', '--json'],
        [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes,
        base_path(),
        $env,
    );
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    $exit = proc_close($process);

    expect($exit)->toBe(0, $stderr)->and(array_column(json_decode($stdout, true), 'uri'))->toContain('api/health');
});
