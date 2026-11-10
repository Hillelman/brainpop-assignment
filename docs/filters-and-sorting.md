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
    'sorts' => [CreatedAtSort::class, UpdatedAtSort::class, TitleSort::class, RiskSort::class],
];
```

`FilterRegistry` and `SortRegistry` instantiate those classes through the container and index them by `key()`. Everything else reads the registries, so adding a class and a config line is the whole change:

- `ListItemsRequest` validates `filter[<key>]` with the filter's `rules()`, rejects unknown filter keys, and accepts `sort` values that are a registered key with an optional `-` prefix.
- `ItemQuery` runs, in order: state scope, search, each active filter's `apply()`, sort, pagination.
- `GET /api/items/filters` returns each filter's `meta()` and each sort's `key` and `label`.
- The queue UI builds its controls from that response, so a new filter or sort shows up with no frontend change. `select` filters render as dropdowns, `date` as a date input and `text` as a text input.

A filter implements `App\Queries\Filters\Contracts\Filter`:

| Method | Purpose |
| --- | --- |
| `key()` | The name used in `filter[<key>]`. |
| `rules()` | Laravel validation rules for the value. |
| `apply(Collection $items, mixed $value, QueryContext $ctx)` | Returns the matching items. `$ctx->user` is the current user. Only called for non-empty values. |
| `meta()` | `key`, `label`, `type` (`select`, `date` or `text`) and, for `select`, `options` as `value`/`label` pairs. |

A sort implements `App\Queries\Sorts\Contracts\Sort`: `key()`, `label()` and `value(Item $item)`, which returns a comparable `int`, `string` or `null`. `null` values always sort last, and ties break on item id.

## Current filters

Query parameters are sent as `filter[<key>]=<value>`.

| Key | Type | Values | Behavior |
| --- | --- | --- | --- |
| `status` | select | `pending`, `approved`, `rejected` | Exact status match. |
| `risk` | select | `low`, `medium`, `high`, `none` | Exact risk; `none` matches items with no risk. |
| `submitter` | select | `everyone`, `mine` | `mine` keeps items submitted by the current user. |
| `created_from` | date | `YYYY-MM-DD` | Created at or after the start of that UTC day. |
| `created_to` | date | `YYYY-MM-DD` | Created at or before the end of that UTC day; must not be earlier than `created_from`. |

## Current sorts

Sent as `sort=<key>`, or `sort=-<key>` for descending. The default is `-created_at`.

| Key | Label | Compared value |
| --- | --- | --- |
| `created_at` | Created | Creation time. |
| `updated_at` | Updated | Last update time (changes when reviewed). |
| `title` | Title | Lower-cased title. |
| `risk` | Risk | `low` < `medium` < `high`; no risk sorts last in both directions. |

The sort dropdown in the UI offers each key ascending plus "Default order". Descending sorts can be used through the API or by editing the URL (for example `?sort=-title`).

## Add a new filter

Example: a text filter that keeps items whose title starts with a given prefix, as `filter[title_prefix]=Login`.

1. Create the class in `backend/app/Queries/Filters/TitlePrefixFilter.php`:

   ```php
   <?php

   namespace App\Queries\Filters;

   use App\Queries\Filters\Contracts\Filter;
   use App\Queries\QueryContext;
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

       public function apply(Collection $items, mixed $value, QueryContext $ctx): Collection
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
   use Tests\Support\ActsAsClerkUser;
   use Tests\Support\UsesTempJsonStorage;

   uses(ActsAsClerkUser::class, UsesTempJsonStorage::class);

   it('filters items by title prefix', function () {
       $submitter = app(UserRepository::class)->upsertFromClerk('user_other', 'Other', 'o@x.io');
       $items = app(ItemRepository::class);
       $match = $items->create(['title' => 'Login page', 'description' => 'd', 'submitter_id' => $submitter->id]);
       $items->create(['title' => 'Checkout', 'description' => 'd', 'submitter_id' => $submitter->id]);

       $response = $this->actingAsClerk()->getJson('/api/items?filter[title_prefix]=login')->assertOk();

       expect(array_column($response->json('data'), 'id'))->toBe([$match->id]);
   });

   it('lists the filter in the metadata', function () {
       $keys = array_column($this->actingAsClerk()->getJson('/api/items/filters')->json('filters'), 'key');

       expect($keys)->toContain('title_prefix');
   });
   ```

4. Run it:

   ```bash
   cd backend
   php artisan test --filter=TitlePrefixFilter
   ```

Unknown keys keep returning `422`, and the queue UI shows the new text input automatically. For a dropdown, return `'type' => 'select'` with `options` and validate with `Rule::in(...)` or `Rule::enum(...)`.

## Add a new sort

Example: sort by description length, as `sort=description_length` or `sort=-description_length`.

1. Create `backend/app/Queries/Sorts/DescriptionLengthSort.php`:

   ```php
   <?php

   namespace App\Queries\Sorts;

   use App\Domain\Entities\Item;
   use App\Queries\Sorts\Contracts\Sort;

   class DescriptionLengthSort implements Sort
   {
       public function key(): string
       {
           return 'description_length';
       }

       public function label(): string
       {
           return 'Description length';
       }

       public function value(Item $item): int
       {
           return mb_strlen($item->description);
       }
   }
   ```

2. Register it in `backend/config/item_query.php`:

   ```php
   'sorts' => [
       CreatedAtSort::class,
       // ...
       DescriptionLengthSort::class,
   ],
   ```

3. Add a test in `backend/tests/Feature/Items/DescriptionLengthSortTest.php`:

   ```php
   <?php

   use App\Repositories\Contracts\ItemRepository;
   use App\Repositories\Contracts\UserRepository;
   use Tests\Support\ActsAsClerkUser;
   use Tests\Support\UsesTempJsonStorage;

   uses(ActsAsClerkUser::class, UsesTempJsonStorage::class);

   it('sorts by description length in both directions', function () {
       $submitter = app(UserRepository::class)->upsertFromClerk('user_other', 'Other', 'o@x.io');
       $items = app(ItemRepository::class);
       $short = $items->create(['title' => 'A', 'description' => 'x', 'submitter_id' => $submitter->id]);
       $long = $items->create(['title' => 'B', 'description' => 'xxxxx', 'submitter_id' => $submitter->id]);

       $ids = fn (string $sort) => array_column(
           $this->actingAsClerk()->getJson('/api/items?sort='.$sort)->assertOk()->json('data'),
           'id',
       );

       expect($ids('description_length'))->toBe([$short->id, $long->id])
           ->and($ids('-description_length'))->toBe([$long->id, $short->id]);
   });
   ```

The sort appears in `/api/items/filters` and in the UI's sort dropdown with no frontend change.
