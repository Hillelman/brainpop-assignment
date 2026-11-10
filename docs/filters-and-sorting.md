# Filters and sorting

How the filter and sort registry works, what is available today, and how to add your own.

## Contents

- [How the registry works](#how-the-registry-works)
- [Current filters](#current-filters)
- [Current sorts](#current-sorts)
- [Add a new filter](#add-a-new-filter)
- [Add a new sort](#add-a-new-sort)

## How the registry works

`backend/config/item_query.php` is the single registry. It lists filter classes and sort classes:

```php
return [
    'filters' => [StatusFilter::class, RiskFilter::class, SubmitterFilter::class, CreatedFromFilter::class, CreatedToFilter::class],
    'sorts' => [CreatedAtSort::class, UpdatedAtSort::class, TitleSort::class, RiskSort::class, StatusSort::class, SubmitterSort::class],
];
```

`FilterRegistry` and `SortRegistry` instantiate those classes through the container and index them by `key()`. Everything else reads the registries, so adding a class and a config line is the whole change:

- `ListItemsRequest` validates `filter[<key>]` with the filter's `rules()`, rejects unknown filter keys, and accepts `sort` values that are a registered key with an optional `-` prefix.
- `ItemQuery` runs, in order: the API-only state scope (default `all`), search, each active filter's `apply()`, sort, pagination.
- `GET /api/items/filters` returns each filter's `meta()` and each sort's `key` and `label`.
- The queue UI builds its controls from that response, so a new filter or sort shows up with no frontend change. `select` filters render as dropdowns, `date` as a date input and `text` as a text input. The sortable column headers come from the sorts list: a header is clickable when its key is registered.

A filter implements `App\Queries\Filters\Contracts\Filter`:

| Method | Purpose |
| --- | --- |
| `key()` | The name used in `filter[<key>]`. |
| `rules()` | Laravel validation rules for the value. |
| `apply(Collection $items, mixed $value)` | Returns the matching items. Only called for non-empty values. |
| `meta()` | `key`, `label`, `type` (`select`, `date` or `text`) and, for `select`, `options` as `value`/`label` pairs. |

A sort implements `App\Queries\Sorts\Contracts\Sort`:

| Method | Purpose |
| --- | --- |
| `key()` | The `sort` value (prefix with `-` for descending). |
| `label()` | The name shown in `/api/items/filters`. |
| `prepare(Collection $items)` | Called once per query with every item about to be sorted, before any `value()` call. Sorts that need related data (such as the submitter's name) load it here in bulk instead of once per item. Most sorts leave it empty. |
| `value(Item $item)` | A comparable `int`, `string` or `null`. |

`null` values always sort last, and ties break on item id.

## Current filters

Query parameters are sent as `filter[<key>]=<value>`.

| Key | Type | Values | Behavior |
| --- | --- | --- | --- |
| `status` | select | `pending`, `approved`, `rejected` | Exact status match. |
| `risk` | select | `low`, `medium`, `high`, `none` | Exact risk; `none` matches items with no risk. |
| `submitter` | select | A user id from the options | Keeps items submitted by that person. The options are the people who have submitted at least one item, sorted by name (value is the user id, label is the name). An id not in the options is rejected with `422`. |
| `created_from` | date | `YYYY-MM-DD` | Created at or after the start of that UTC day. |
| `created_to` | date | `YYYY-MM-DD` | Created at or before the end of that UTC day; must not be earlier than `created_from`. |

### Worked example: the submitter filter

`SubmitterFilter` is a `select` filter whose options are computed from the data, not fixed:

- `meta()` returns `type: select` with one option per person who has submitted at least one item: `value` is the user id (as a string) and `label` is their name, sorted by name.
- `rules()` is `['nullable', 'string', Rule::in(<those option values>)]`, so an unknown id gives `422 validation_failed` like any other select filter.
- `apply()` keeps items whose `submitterId` equals the value.

It reads both repositories through constructor injection (`ItemRepository` for the submitter ids, `UserRepository::findMany` for the names), which works because the registry builds filters through the container. The dropdown in the UI therefore lists new people as soon as they submit, with no frontend change. Because there are no accounts, there is no "mine" option; pick your own name from the list.

## Current sorts

Sent as `sort=<key>`, or `sort=-<key>` for descending. The default is `-created_at`.

| Key | Label | Compared value |
| --- | --- | --- |
| `created_at` | Created | Creation time. |
| `updated_at` | Updated | Last update time (changes when reviewed). |
| `title` | Title | Lower-cased title. |
| `risk` | Risk | `low` < `medium` < `high`; no risk sorts last in both directions. |
| `status` | Status | `pending` < `approved` < `rejected`. |
| `submitter` | Submitter | Lower-cased submitter name (needs related data, so it uses `prepare()`). |

The queue UI sorts by clicking the Title, Status, Risk, Submitter and Created column headers (a compact "Sort: ..." menu on phones); a click toggles the direction and Created starts newest-first. See [User guide](user-guide.md#sorting). `updated_at` is available through the API only.

## Add a new filter

Example: a text filter that keeps items whose title starts with a given prefix, as `filter[title_prefix]=Login`.

1. Create the class in `backend/app/Queries/Filters/TitlePrefixFilter.php`:

   ```php
   <?php

   namespace App\Queries\Filters;

   use App\Queries\Filters\Contracts\Filter;
   use Illuminate\Support\Collection;

   class TitlePrefixFilter implements Filter
   {
       public function key(): string
       {
           return 'title_prefix';
       }

       public function rules(): array
       {
           return ['nullable', 'string', 'max:50'];
       }

       public function apply(Collection $items, mixed $value): Collection
       {
           $prefix = mb_strtolower((string) $value);

           return $items->filter(fn ($item): bool => str_starts_with(mb_strtolower($item->title), $prefix));
       }

       public function meta(): array
       {
           return ['key' => $this->key(), 'label' => 'Title starts with', 'type' => 'text'];
       }
   }
   ```

2. Register it in `backend/config/item_query.php` (add the `use` import too):

   ```php
   'filters' => [
       StatusFilter::class,
       // ...
       TitlePrefixFilter::class,
   ],
   ```

3. Add a test in `backend/tests/Feature/Items/TitlePrefixFilterTest.php`:

   ```php
   <?php

   use App\Repositories\Contracts\ItemRepository;
   use App\Repositories\Contracts\UserRepository;
   use Tests\Support\UsesTempJsonStorage;

   uses(UsesTempJsonStorage::class);

   it('filters items by title prefix', function () {
       $submitter = app(UserRepository::class)->findOrCreateByName('Other Person');
       $items = app(ItemRepository::class);
       $match = $items->create(['title' => 'Login page', 'description' => 'd', 'submitter_id' => $submitter->id]);
       $items->create(['title' => 'Checkout', 'description' => 'd', 'submitter_id' => $submitter->id]);

       $response = $this->getJson('/api/items?filter[title_prefix]=login')->assertOk();

       expect(array_column($response->json('data'), 'id'))->toBe([$match->id]);
   });

   it('lists the filter in the metadata', function () {
       $keys = array_column($this->getJson('/api/items/filters')->json('filters'), 'key');

       expect($keys)->toContain('title_prefix');
   });
   ```

4. Run it:

   ```bash
   cd backend
   php artisan test --filter=TitlePrefixFilter
   ```

Unknown keys keep returning `422`, and the queue UI shows the new text input automatically. For a dropdown, return `'type' => 'select'` with `options` and validate with `Rule::in(...)` or `Rule::enum(...)`, as `SubmitterFilter` does.

## Add a new sort

Example: sort by submitter name length, as `sort=submitter_length` or `sort=-submitter_length`. It needs the submitter's name, which is not on the item, so it uses `prepare()` to load the names once for the whole list.

1. Create `backend/app/Queries/Sorts/SubmitterLengthSort.php`:

   ```php
   <?php

   namespace App\Queries\Sorts;

   use App\Domain\Entities\Item;
   use App\Queries\Sorts\Contracts\Sort;
   use App\Repositories\Contracts\UserRepository;
   use Illuminate\Support\Collection;

   class SubmitterLengthSort implements Sort
   {
       /** @var array<int, int> name lengths keyed by user id */
       private array $lengths = [];

       public function __construct(private readonly UserRepository $users) {}

       public function key(): string
       {
           return 'submitter_length';
       }

       public function label(): string
       {
           return 'Submitter name length';
       }

       public function prepare(Collection $items): void
       {
           $users = $this->users->findMany($items->pluck('submitterId')->unique()->values()->all());

           $this->lengths = array_map(fn ($user): int => mb_strlen($user->name), $users);
       }

       public function value(Item $item): ?int
       {
           return $this->lengths[$item->submitterId] ?? null;
       }
   }
   ```

   `prepare()` is called once per query, before any `value()` call, with every item about to be sorted. A sort that only needs the item itself (like `TitleSort`) leaves `prepare()` empty. `value()` may return `null`; those items always sort last.

2. Register it in `backend/config/item_query.php`:

   ```php
   'sorts' => [
       CreatedAtSort::class,
       // ...
       SubmitterLengthSort::class,
   ],
   ```

3. Add a test in `backend/tests/Feature/Items/SubmitterLengthSortTest.php`:

   ```php
   <?php

   use App\Repositories\Contracts\ItemRepository;
   use App\Repositories\Contracts\UserRepository;
   use Tests\Support\UsesTempJsonStorage;

   uses(UsesTempJsonStorage::class);

   it('sorts by submitter name length in both directions', function () {
       $items = app(ItemRepository::class);
       $users = app(UserRepository::class);
       $short = $items->create(['title' => 'A', 'description' => 'd', 'submitter_id' => $users->findOrCreateByName('Al')->id]);
       $long = $items->create(['title' => 'B', 'description' => 'd', 'submitter_id' => $users->findOrCreateByName('Alexandra')->id]);

       $ids = fn (string $sort) => array_column($this->getJson('/api/items?sort='.$sort)->assertOk()->json('data'), 'id');

       expect($ids('submitter_length'))->toBe([$short->id, $long->id])
           ->and($ids('-submitter_length'))->toBe([$long->id, $short->id]);
   });
   ```

The sort appears in `/api/items/filters` and is accepted by the API with no further change. The queue UI shows a clickable header only for the five built-in columns (Title, Status, Risk, Submitter, Created), so a new sort is available through `?sort=` and the API until a header is added in `frontend/src/components/queue/sorting.ts`.
