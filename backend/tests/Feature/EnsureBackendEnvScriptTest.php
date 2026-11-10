<?php

use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->root = sys_get_temp_dir().'/ensure-env-'.bin2hex(random_bytes(6));
    File::ensureDirectoryExists($this->root.'/scripts');
    File::ensureDirectoryExists($this->root.'/backend');
    File::copy(base_path('../scripts/ensure-backend-env.sh'), $this->root.'/scripts/ensure-backend-env.sh');
    $this->env = $this->root.'/backend/.env';
    $this->example = $this->root.'/backend/.env.example';
    File::put($this->example, "APP_NAME=Test\nAPP_KEY=\nAPP_DEBUG=true\n");

    $this->runScript = function (string $cwd = '/'): array {
        exec('cd '.escapeshellarg($cwd).' && sh '.escapeshellarg($this->root.'/scripts/ensure-backend-env.sh').' 2>&1', $out, $code);

        return [implode("\n", $out), $code];
    };
});

afterEach(function () {
    File::deleteDirectory($this->root);
});

it('creates .env from the example with a generated key', function () {
    [$output, $code] = ($this->runScript)();

    expect($code)->toBe(0);
    $lines = file($this->env, FILE_IGNORE_NEW_LINES);
    expect($lines[1])->toMatch('/^APP_KEY=base64:.{40,}$/');
    expect([$lines[0], $lines[2]])->toBe(['APP_NAME=Test', 'APP_DEBUG=true']);
    expect($output)->toContain('Created backend/.env')
        ->not->toContain(substr($lines[1], 8));
});

it('fills an empty APP_KEY and leaves other lines identical', function () {
    File::put($this->env, "APP_NAME=Mine\nAPP_KEY=\nCUSTOM=1\n");

    [$output, $code] = ($this->runScript)();

    expect($code)->toBe(0);
    $lines = file($this->env, FILE_IGNORE_NEW_LINES);
    expect($lines[1])->toMatch('/^APP_KEY=base64:.{40,}$/');
    expect([$lines[0], $lines[2]])->toBe(['APP_NAME=Mine', 'CUSTOM=1']);
    expect($output)->toContain('Generated APP_KEY')->not->toContain(substr($lines[1], 8));
});

it('appends APP_KEY when the line is missing', function () {
    File::put($this->env, "APP_NAME=Mine\n");

    [, $code] = ($this->runScript)();

    expect($code)->toBe(0);
    $lines = file($this->env, FILE_IGNORE_NEW_LINES);
    expect($lines[0])->toBe('APP_NAME=Mine');
    expect($lines[1])->toMatch('/^APP_KEY=base64:/');
});

it('leaves an existing key untouched', function () {
    File::put($this->env, "APP_KEY=base64:c2VjcmV0c2VjcmV0c2VjcmV0c2VjcmV0MTIzNDU2Nzg=\nX=1\n");
    touch($this->env, 1000000000);
    $before = file_get_contents($this->env);

    [$output, $code] = ($this->runScript)();

    clearstatcache();
    expect($code)->toBe(0);
    expect(file_get_contents($this->env))->toBe($before);
    expect(filemtime($this->env))->toBe(1000000000);
    expect($output)->not->toContain('c2VjcmV0');
});

it('fails clearly without .env.example and creates no file', function () {
    File::delete($this->example);

    [$output, $code] = ($this->runScript)();

    expect($code)->not->toBe(0);
    expect($output)->toContain('.env.example');
    expect(file_exists($this->env))->toBeFalse();
});
