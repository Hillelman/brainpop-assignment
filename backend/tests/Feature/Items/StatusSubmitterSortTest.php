<?php

use App\Enums\ItemStatus;
use App\Queries\Sorts\SubmitterSort;
use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\UserRepository;
use Tests\Support\UsesTempJsonStorage;

uses(UsesTempJsonStorage::class);

function sortSeed(string $submitter, ItemStatus $status = ItemStatus::Pending): int
{
    return app(ItemRepository::class)->create([
        'title' => 'Item '.$submitter,
        'description' => 'Desc',
        'submitter_id' => app(UserRepository::class)->findOrCreateByName($submitter)->id,
        'status' => $status->value,
    ])->id;
}

function sortIds($test, string $uri): array
{
    return array_column($test->getJson($uri)->assertOk()->json('data'), 'id');
}

it('sorts by status in both directions', function () {
    $rejected = sortSeed('A', ItemStatus::Rejected);
    $pending = sortSeed('B', ItemStatus::Pending);
    $approved = sortSeed('C', ItemStatus::Approved);

    expect(sortIds($this, '/api/items?state=all&sort=status'))->toBe([$pending, $approved, $rejected])
        ->and(sortIds($this, '/api/items?state=all&sort=-status'))->toBe([$rejected, $approved, $pending]);
});

it('sorts by submitter name case-insensitively with id tie-break', function () {
    $zed = sortSeed('Zed');
    $ana = sortSeed('ana');
    $bob = sortSeed('Bob');
    $ana2 = sortSeed('Ana');

    expect(sortIds($this, '/api/items?sort=submitter'))->toBe([$ana, $ana2, $bob, $zed])
        ->and(sortIds($this, '/api/items?sort=-submitter'))->toBe([$zed, $bob, $ana2, $ana]);
});

it('applies the submitter sort to search', function () {
    $b = sortSeed('Bob');
    $a = sortSeed('Ana');

    expect(sortIds($this, '/api/items/search?q=item&sort=submitter'))->toBe([$a, $b]);
});

it('lists status and submitter sorts', function () {
    $sorts = $this->getJson('/api/items/filters')->assertOk()->json('sorts');

    expect($sorts)->toContain(['key' => 'status', 'label' => 'Status'])
        ->and($sorts)->toContain(['key' => 'submitter', 'label' => 'Submitter']);
});

it('loads submitters once per query', function () {
    foreach (range(1, 30) as $i) {
        sortSeed("User $i");
    }
    $real = app(UserRepository::class);
    $calls = 0;
    $spy = Mockery::mock(UserRepository::class);
    $spy->shouldReceive('findMany')->andReturnUsing(function (array $ids) use ($real, &$calls) {
        $calls++;

        return $real->findMany($ids);
    });
    $sort = new SubmitterSort($spy);
    $items = app(ItemRepository::class)->all();

    $sort->prepare($items);
    $items->each(fn ($item) => $sort->value($item));

    expect($calls)->toBe(1);
});
