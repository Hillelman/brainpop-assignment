<?php

use App\Enums\ItemStatus;
use App\Enums\ReviewDecision;
use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Contracts\UserRepository;
use Tests\Support\UsesTempJsonStorage;

uses(UsesTempJsonStorage::class);

function reviewedItem(string $title, array $reviewDates): int
{
    $user = app(UserRepository::class)->findOrCreateByName('Rev');
    $id = app(ItemRepository::class)->create([
        'title' => $title,
        'description' => 'Desc',
        'submitter_id' => $user->id,
        'status' => $reviewDates === [] ? ItemStatus::Pending->value : ItemStatus::Approved->value,
    ])->id;
    foreach ($reviewDates as $date) {
        app(ReviewRepository::class)->create([
            'item_id' => $id,
            'reviewer_id' => $user->id,
            'decision' => ReviewDecision::Approved,
            'created_at' => $date,
        ]);
    }

    return $id;
}

function reviewedIds($test, string $query): array
{
    $ids = array_column($test->getJson('/api/items?state=all&sort=created_at&'.$query)->assertOk()->json('data'), 'id');
    sort($ids);

    return $ids;
}

beforeEach(function () {
    $this->early = reviewedItem('early', ['2026-03-09T23:59:59Z']);
    $this->mid = reviewedItem('mid', ['2026-03-10T00:00:00Z']);
    $this->late = reviewedItem('late', ['2026-03-11T23:59:59Z']);
    $this->none = reviewedItem('none', []);
});

it('filters by reviewed_from from the UTC day start and excludes unreviewed items', function () {
    expect(reviewedIds($this, 'filter[reviewed_from]=2026-03-10'))->toBe([$this->mid, $this->late]);
});

it('filters by reviewed_to inclusive through the end of the day', function () {
    expect(reviewedIds($this, 'filter[reviewed_to]=2026-03-11'))->toBe([$this->early, $this->mid, $this->late])
        ->and(reviewedIds($this, 'filter[reviewed_to]=2026-03-10'))->toBe([$this->early, $this->mid]);
});

it('filters by a reviewed range and rejects reversed or invalid dates', function () {
    expect(reviewedIds($this, 'filter[reviewed_from]=2026-03-10&filter[reviewed_to]=2026-03-10'))->toBe([$this->mid]);

    $this->getJson('/api/items?filter[reviewed_from]=2026-03-12&filter[reviewed_to]=2026-03-01')
        ->assertStatus(422)->assertJsonValidationErrors('filter.reviewed_to');
    $this->getJson('/api/items?filter[reviewed_from]=nope')->assertStatus(422);
});

it('uses only the latest review of an item', function () {
    $multi = reviewedItem('multi', ['2026-01-01T10:00:00Z', '2026-03-20T10:00:00Z']);

    expect(reviewedIds($this, 'filter[reviewed_to]=2026-02-01'))->toBe([])
        ->and(reviewedIds($this, 'filter[reviewed_from]=2026-03-20'))->toBe([$multi]);
});

it('does not reuse review dates between separate requests', function () {
    expect(reviewedIds($this, 'filter[reviewed_from]=2026-03-10'))->toBe([$this->mid, $this->late]);

    app(ReviewRepository::class)->create([
        'item_id' => $this->none,
        'reviewer_id' => app(UserRepository::class)->findOrCreateByName('Rev')->id,
        'decision' => ReviewDecision::Approved,
        'created_at' => '2026-03-12T00:00:00Z',
    ]);

    expect(reviewedIds($this, 'filter[reviewed_from]=2026-03-10'))->toBe([$this->mid, $this->late, $this->none]);
});

it('returns nothing for pending items combined with a reviewed filter', function () {
    expect(reviewedIds($this, 'filter[status]=pending&filter[reviewed_from]=2026-01-01'))->toBe([]);
});

it('loads reviews once for both filters, plus once for the page view', function () {
    $inner = app(ReviewRepository::class);
    $spy = Mockery::mock(ReviewRepository::class);
    $spy->shouldReceive('forItems')->twice()->andReturnUsing(fn (array $ids): array => $inner->forItems($ids));
    $spy->shouldReceive('forItem')->andReturnUsing(fn (int $id) => $inner->forItem($id));
    app()->instance(ReviewRepository::class, $spy);

    $this->getJson('/api/items?state=all&filter[reviewed_from]=2026-03-10&filter[reviewed_to]=2026-03-31')->assertOk();
});

it('exposes groups and labels in filter metadata', function () {
    $filters = collect($this->getJson('/api/items/filters')->assertOk()->json('filters'))->keyBy('key');

    expect($filters['reviewed_from'])->toMatchArray(['type' => 'date', 'label' => 'From', 'group' => 'reviewed_at', 'group_label' => 'Reviewed at'])
        ->and($filters['reviewed_to'])->toMatchArray(['type' => 'date', 'label' => 'To', 'group' => 'reviewed_at', 'group_label' => 'Reviewed at'])
        ->and($filters['created_from'])->toMatchArray(['label' => 'From', 'group' => 'created_at', 'group_label' => 'Created at'])
        ->and($filters['created_to'])->toMatchArray(['label' => 'To', 'group' => 'created_at', 'group_label' => 'Created at'])
        ->and($filters['status'])->not->toHaveKey('group')
        ->and($filters['risk'])->not->toHaveKey('group')
        ->and($filters['submitter'])->not->toHaveKey('group');
});
