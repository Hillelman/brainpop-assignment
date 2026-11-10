<?php

use App\Domain\Entities\User;
use App\Queries\ItemQuery;
use App\Queries\ItemQueryParams;
use App\Repositories\Contracts\ItemRepository;
use Carbon\CarbonImmutable;
use Tests\Support\UsesTempJsonStorage;
use Tests\TestCase;

uses(TestCase::class, UsesTempJsonStorage::class);

it('breaks ties by id in sort direction and keeps nulls last', function () {
    $items = app(ItemRepository::class);
    $a = $items->create(['title' => 'Same', 'description' => 'd', 'submitter_id' => 1]);
    $b = $items->create(['title' => 'same', 'description' => 'd', 'submitter_id' => 1]);

    $user = new User(1, 'c', 'n', 'e', CarbonImmutable::now());
    $ids = fn (string $sort) => app(ItemQuery::class)->run(new ItemQueryParams(sort: $sort), $user)
        ->getCollection()->map(fn ($v) => $v->item->id)->all();

    expect($ids('title'))->toBe([$a->id, $b->id])
        ->and($ids('-title'))->toBe([$b->id, $a->id])
        ->and($ids('-risk'))->toBe([$b->id, $a->id]);
});
