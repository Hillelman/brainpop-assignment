<?php

use App\Exceptions\StorageCorruptedException;
use App\Storage\CollectionTransaction;
use App\Storage\JsonStore;
use Tests\Support\UsesTempJsonStorage;
use Tests\TestCase;

uses(TestCase::class, UsesTempJsonStorage::class);

function store(): JsonStore
{
    return new JsonStore(config('storage_json.path'));
}

it('reads a missing file as empty and creates it on first transaction', function () {
    expect(store()->read('things'))->toBe([])
        ->and(is_file($this->jsonStoragePath.'/things.json'))->toBeFalse();

    store()->transaction('things', fn (CollectionTransaction $tx) => $tx->insert(['name' => 'a']));

    expect(is_file($this->jsonStoragePath.'/things.json'))->toBeTrue();
});

it('treats empty files and empty arrays as empty collections', function () {
    mkdir($this->jsonStoragePath, 0755, true);
    file_put_contents($this->jsonStoragePath.'/a.json', '');
    file_put_contents($this->jsonStoragePath.'/b.json', '[]');

    expect(store()->read('a'))->toBe([])->and(store()->read('b'))->toBe([]);
});

it('throws on invalid JSON and leaves the file untouched', function () {
    mkdir($this->jsonStoragePath, 0755, true);
    $file = $this->jsonStoragePath.'/things.json';
    file_put_contents($file, '{not json');

    expect(fn () => store()->read('things'))->toThrow(StorageCorruptedException::class);
    expect(fn () => store()->transaction('things', fn (CollectionTransaction $tx) => $tx->insert(['x' => 1])))
        ->toThrow(StorageCorruptedException::class);
    expect(file_get_contents($file))->toBe('{not json');
});

it('assigns incrementing ids and leaves no temp files behind', function () {
    $store = store();
    $first = $store->transaction('things', fn (CollectionTransaction $tx) => $tx->insert(['name' => 'a']));
    $second = $store->transaction('things', fn (CollectionTransaction $tx) => $tx->insert(['name' => 'b']));

    expect($first['id'])->toBe(1)->and($second['id'])->toBe(2);
    expect(json_decode(file_get_contents($this->jsonStoragePath.'/things.json'), true))->toHaveCount(2);
    expect(glob($this->jsonStoragePath.'/*.tmp.*'))->toBe([]);
});

it('does not persist anything when the mutator throws', function () {
    $store = store();
    $store->transaction('things', fn (CollectionTransaction $tx) => $tx->insert(['name' => 'a']));

    expect(fn () => $store->transaction('things', function (CollectionTransaction $tx) {
        $tx->insert(['name' => 'b']);

        throw new RuntimeException('boom');
    }))->toThrow(RuntimeException::class);

    expect($store->read('things'))->toHaveCount(1)
        ->and(store()->read('things'))->toHaveCount(1);
});

it('reads each collection file only once per instance and reflects writes', function () {
    $store = store();
    $store->transaction('things', fn (CollectionTransaction $tx) => $tx->insert(['name' => 'a']));
    $file = $this->jsonStoragePath.'/things.json';

    $cached = (new JsonStore($this->jsonStoragePath));
    expect($cached->read('things'))->toHaveCount(1);

    file_put_contents($file, '[]');
    expect($cached->read('things'))->toHaveCount(1);

    $cached->transaction('things', fn (CollectionTransaction $tx) => $tx->insert(['name' => 'b']));
    expect($cached->read('things'))->toHaveCount(1)
        ->and($cached->read('things')[0]['name'])->toBe('b');
});

it('does not lose updates across separate instances', function () {
    $a = new JsonStore($this->jsonStoragePath);
    $b = new JsonStore($this->jsonStoragePath);

    $a->transaction('things', fn (CollectionTransaction $tx) => $tx->insert(['name' => 'a']));
    $b->transaction('things', fn (CollectionTransaction $tx) => $tx->insert(['name' => 'b']));

    $records = (new JsonStore($this->jsonStoragePath))->read('things');
    expect(array_column($records, 'name'))->toBe(['a', 'b'])
        ->and(array_column($records, 'id'))->toBe([1, 2]);
});

it('joins nested transactions on the same collection', function () {
    $store = store();
    $store->transaction('things', function () use ($store) {
        $store->transaction('things', fn (CollectionTransaction $tx) => $tx->insert(['name' => 'a']));

        expect($store->read('things'))->toHaveCount(1);
    });

    expect(store()->read('things'))->toHaveCount(1);
});
