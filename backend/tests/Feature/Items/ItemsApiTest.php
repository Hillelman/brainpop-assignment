<?php

use App\Domain\Entities\Item;
use App\Enums\ItemStatus;
use App\Enums\ReviewDecision;
use App\Enums\RiskLevel;
use App\Queries\Filters\Contracts\Filter;
use App\Queries\QueryContext;
use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Contracts\UserRepository;
use Illuminate\Support\Collection;
use Tests\Support\ActsAsClerkUser;
use Tests\Support\UsesTempJsonStorage;

uses(ActsAsClerkUser::class, UsesTempJsonStorage::class);

function seedItem(array $attrs = []): Item
{
    return app(ItemRepository::class)->create($attrs + [
        'title' => 'Item',
        'description' => 'Desc',
        'submitter_id' => app(UserRepository::class)->upsertFromClerk('user_other', 'Other', 'o@x.io')->id,
    ]);
}

function ids($response): array
{
    return array_column($response->json('data'), 'id');
}

it('requires a token on every endpoint', function (string $method, string $uri) {
    $this->json($method, $uri)->assertUnauthorized()->assertJson(['code' => 'unauthenticated']);
})->with([
    ['GET', '/api/items'], ['GET', '/api/items/search'], ['GET', '/api/items/filters'],
    ['POST', '/api/items'], ['GET', '/api/items/1'], ['GET', '/api/items/1/reviews'],
]);

it('returns an empty page when there are no items', function () {
    $this->actingAsClerk()->getJson('/api/items')->assertOk()
        ->assertJsonPath('data', [])
        ->assertJsonPath('meta.total', 0)
        ->assertJsonPath('meta.last_page', 1);
});

it('lists items newest first with pagination meta', function () {
    foreach (range(1, 20) as $i) {
        seedItem(['title' => "T$i", 'created_at' => '2026-01-'.sprintf('%02d', $i).'T00:00:00Z']);
    }

    $response = $this->actingAsClerk()->getJson('/api/items')->assertOk()
        ->assertJsonStructure(['data' => [['id', 'title', 'description', 'status', 'risk', 'submitter' => ['id', 'name'], 'created_at', 'updated_at', 'latest_review']], 'meta' => ['current_page', 'per_page', 'total', 'last_page']])
        ->assertJsonPath('meta.per_page', 15)
        ->assertJsonPath('meta.total', 20)
        ->assertJsonPath('meta.last_page', 2)
        ->assertJsonPath('data.0.title', 'T20')
        ->assertJsonPath('data.0.submitter.name', 'Other');
    expect($response->json('data'))->toHaveCount(15);
});

it('returns 200 with empty data for an out-of-range page', function () {
    seedItem();
    seedItem();

    $this->actingAsClerk()->getJson('/api/items?page=9&per_page=1')->assertOk()
        ->assertJsonPath('data', [])
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('meta.last_page', 2);
});

it('scopes by state', function () {
    $p = seedItem();
    $a = seedItem(['status' => ItemStatus::Approved]);
    $r = seedItem(['status' => ItemStatus::Rejected]);

    expect(ids($this->actingAsClerk()->getJson('/api/items?state=pending')))->toBe([$p->id])
        ->and(ids($this->actingAsClerk()->getJson('/api/items?state=reviewed')))->toBe([$r->id, $a->id])
        ->and(ids($this->actingAsClerk()->getJson('/api/items?state=all')))->toBe([$r->id, $a->id, $p->id]);
});

it('applies each filter', function () {
    $mine = app(UserRepository::class)->upsertFromClerk('user_me', 'user_me@example.com', 'user_me@example.com');
    $a = seedItem(['status' => ItemStatus::Approved, 'risk' => RiskLevel::High, 'submitter_id' => $mine->id, 'created_at' => '2026-03-10T23:59:59Z']);
    $b = seedItem(['status' => ItemStatus::Rejected, 'risk' => RiskLevel::Low, 'created_at' => '2026-03-11T00:00:00Z']);
    $c = seedItem(['created_at' => '2026-03-12T10:00:00Z']);

    $get = fn (string $q) => ids($this->actingAsClerk('user_me')->getJson('/api/items?'.$q));

    expect($get('filter[status]=approved'))->toBe([$a->id])
        ->and($get('filter[risk]=low'))->toBe([$b->id])
        ->and($get('filter[risk]=none'))->toBe([$c->id])
        ->and($get('filter[submitter]=mine'))->toBe([$a->id])
        ->and($get('filter[submitter]=everyone'))->toHaveCount(3)
        ->and($get('filter[created_from]=2026-03-11'))->toBe([$c->id, $b->id])
        ->and($get('filter[created_to]=2026-03-10'))->toBe([$a->id])
        ->and($get('filter[created_from]=2026-03-11&filter[created_to]=2026-03-11'))->toBe([$b->id]);
});

it('sorts ascending and descending', function () {
    $x = seedItem(['title' => 'banana', 'risk' => RiskLevel::High, 'created_at' => '2026-01-02T00:00:00Z', 'updated_at' => '2026-02-01T00:00:00Z']);
    $y = seedItem(['title' => 'Apple', 'risk' => RiskLevel::Low, 'created_at' => '2026-01-03T00:00:00Z', 'updated_at' => '2026-02-03T00:00:00Z']);
    $z = seedItem(['title' => 'cherry', 'created_at' => '2026-01-01T00:00:00Z', 'updated_at' => '2026-02-02T00:00:00Z']);

    $get = fn (string $s) => ids($this->actingAsClerk()->getJson('/api/items?sort='.$s));

    expect($get('title'))->toBe([$y->id, $x->id, $z->id])
        ->and($get('-title'))->toBe([$z->id, $x->id, $y->id])
        ->and($get('risk'))->toBe([$y->id, $x->id, $z->id])
        ->and($get('-risk'))->toBe([$x->id, $y->id, $z->id])
        ->and($get('created_at'))->toBe([$z->id, $x->id, $y->id])
        ->and($get('-created_at'))->toBe([$y->id, $x->id, $z->id])
        ->and($get('updated_at'))->toBe([$x->id, $z->id, $y->id])
        ->and($get('-updated_at'))->toBe([$y->id, $z->id, $x->id]);
});

it('rejects invalid list params with 422', function (string $query, string $errorKey) {
    seedItem();

    $this->actingAsClerk()->getJson('/api/items?'.$query)->assertStatus(422)
        ->assertJson(['code' => 'validation_failed'])
        ->assertJsonValidationErrors($errorKey);
})->with([
    ['per_page=0', 'per_page'],
    ['per_page=101', 'per_page'],
    ['page=0', 'page'],
    ['sort=bogus', 'sort'],
    ['state=nope', 'state'],
    ['filter[nope]=x', 'filter.nope'],
    ['filter[status]=bogus', 'filter.status'],
    ['filter[created_from]=2026-03-12&filter[created_to]=2026-03-01', 'filter.created_to'],
]);

it('searches title and description case-insensitively including multibyte', function () {
    $a = seedItem(['title' => 'Hello World']);
    $b = seedItem(['title' => 'Other', 'description' => 'about ÉCOLE things', 'status' => ItemStatus::Approved]);
    seedItem(['title' => 'Nope']);

    $get = fn (string $q) => ids($this->actingAsClerk()->getJson('/api/items/search?'.$q));

    expect($get('q=WORLD'))->toBe([$a->id])
        ->and($get('q=école'))->toBe([$b->id])
        ->and($get('q=o&state=pending'))->toHaveCount(2)
        ->and($get('q=o&filter[status]=approved'))->toBe([$b->id])
        ->and($get('q=o&sort=title&per_page=1&page=2'))->toHaveCount(1)
        ->and($get('q='))->toHaveCount(3)
        ->and($get('q=%20%20'))->toHaveCount(3);
});

it('rejects an over-long search query', function () {
    $this->actingAsClerk()->getJson('/api/items/search?q='.str_repeat('a', 101))
        ->assertStatus(422)->assertJson(['code' => 'validation_failed']);
});

it('lists registered filters and sorts', function () {
    $response = $this->actingAsClerk()->getJson('/api/items/filters')->assertOk();

    expect(array_column($response->json('filters'), 'key'))->toBe(['status', 'risk', 'submitter', 'created_from', 'created_to'])
        ->and(array_column($response->json('sorts'), 'key'))->toBe(['created_at', 'updated_at', 'title', 'risk'])
        ->and($response->json('filters.0.options'))->toContain(['value' => 'pending', 'label' => 'Pending'])
        ->and($response->json('filters.3.type'))->toBe('date');
});

class DummyFilter implements Filter
{
    public function key(): string
    {
        return 'dummy';
    }

    public function rules(): array
    {
        return ['nullable', 'string'];
    }

    public function apply(Collection $items, mixed $value, QueryContext $ctx): Collection
    {
        return $items->filter(fn ($item): bool => $item->title === $value);
    }

    public function meta(): array
    {
        return ['key' => 'dummy', 'label' => 'Dummy', 'type' => 'text'];
    }
}

it('picks up a newly registered filter without other changes', function () {
    config(['item_query.filters' => [...config('item_query.filters'), DummyFilter::class]]);
    $a = seedItem(['title' => 'match']);
    seedItem(['title' => 'other']);

    expect(array_column($this->actingAsClerk()->getJson('/api/items/filters')->json('filters'), 'key'))->toContain('dummy')
        ->and(ids($this->actingAsClerk()->getJson('/api/items?filter[dummy]=match')))->toBe([$a->id]);
});

it('creates a pending item owned by the caller', function () {
    $this->actingAsClerk('user_me')->postJson('/api/items', ['title' => '  Hello  ', 'description' => 'Body'])
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.title', 'Hello')
        ->assertJsonPath('data.latest_review', null)
        ->assertJsonPath('data.submitter.name', 'user_me@example.com');
});

it('validates item submission', function (array $payload, array $fields) {
    $this->actingAsClerk()->postJson('/api/items', $payload)->assertStatus(422)
        ->assertJson(['code' => 'validation_failed'])
        ->assertJsonValidationErrors($fields);
})->with([
    [[], ['title', 'description']],
    [['title' => 'ab', 'description' => 'x'], ['title']],
    [['title' => 'abc', 'description' => str_repeat('a', 5001)], ['description']],
]);

it('shows an item with submitter and latest review', function () {
    $item = seedItem(['status' => ItemStatus::Approved, 'risk' => RiskLevel::Medium]);
    $reviewer = app(UserRepository::class)->upsertFromClerk('rev', 'Rev', 'r@x.io');
    $reviews = app(ReviewRepository::class);
    $reviews->create(['item_id' => $item->id, 'reviewer_id' => $reviewer->id, 'decision' => ReviewDecision::Rejected]);
    $reviews->create(['item_id' => $item->id, 'reviewer_id' => $reviewer->id, 'decision' => ReviewDecision::Approved, 'risk' => RiskLevel::Medium, 'note' => 'ok']);

    $this->actingAsClerk()->getJson('/api/items/'.$item->id)->assertOk()
        ->assertJsonPath('data.id', $item->id)
        ->assertJsonPath('data.submitter.name', 'Other')
        ->assertJsonPath('data.latest_review.decision', 'approved')
        ->assertJsonPath('data.latest_review.note', 'ok')
        ->assertJsonPath('data.latest_review.reviewer.name', 'Rev');
});

it('returns 404 for unknown items', function (string $uri) {
    $this->actingAsClerk()->getJson($uri)->assertNotFound()->assertJson(['code' => 'not_found']);
})->with(['/api/items/999999', '/api/items/abc', '/api/items/999999/reviews']);

it('paginates the review history newest first', function () {
    $item = seedItem();
    $reviewer = app(UserRepository::class)->upsertFromClerk('rev', 'Rev', 'r@x.io');
    $reviews = app(ReviewRepository::class);
    $first = $reviews->create(['item_id' => $item->id, 'reviewer_id' => $reviewer->id, 'decision' => ReviewDecision::Rejected]);
    $second = $reviews->create(['item_id' => $item->id, 'reviewer_id' => $reviewer->id, 'decision' => ReviewDecision::Approved]);

    $this->actingAsClerk()->getJson('/api/items/'.$item->id.'/reviews?per_page=1')->assertOk()
        ->assertJsonPath('data.0.id', $second->id)
        ->assertJsonPath('data.0.reviewer.name', 'Rev')
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('meta.last_page', 2);

    $this->actingAsClerk()->getJson('/api/items/'.$item->id.'/reviews?per_page=1&page=2')
        ->assertJsonPath('data.0.id', $first->id);
});
