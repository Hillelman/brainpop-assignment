<?php

namespace App\Http\Requests;

use App\Queries\FilterRegistry;
use App\Queries\ItemQueryParams;
use App\Queries\SortRegistry;
use App\Queries\StateScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ListItemsRequest extends FormRequest
{
    private const DEFAULT_SORT = '-created_at';

    private const DEFAULT_PER_PAGE = 15;

    public const MAX_PAGE = 100000;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $sortKeys = array_keys(app(SortRegistry::class)->all());

        $rules = [
            'state' => ['nullable', Rule::enum(StateScope::class)],
            'page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PAGE],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'sort' => ['nullable', 'string', Rule::in([...$sortKeys, ...array_map(fn (string $k): string => '-'.$k, $sortKeys)])],
            'filter' => ['nullable', 'array'],
        ];

        foreach (app(FilterRegistry::class)->all() as $key => $filter) {
            $rules['filter.'.$key] = $filter->rules();
        }

        return $rules;
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $filter = $this->input('filter');
                if (! is_array($filter)) {
                    return;
                }

                $known = app(FilterRegistry::class)->all();
                foreach (array_keys($filter) as $key) {
                    if (! isset($known[$key])) {
                        $validator->errors()->add('filter.'.$key, "The filter '{$key}' is not supported.");
                    }
                }
            },
        ];
    }

    public function toParams(): ItemQueryParams
    {
        $validated = $this->validated();

        return new ItemQueryParams(
            state: StateScope::from($validated['state'] ?? StateScope::All->value),
            search: $validated['q'] ?? null,
            filters: array_filter($validated['filter'] ?? [], fn (mixed $v): bool => $v !== null && $v !== ''),
            sort: $validated['sort'] ?? self::DEFAULT_SORT,
            page: (int) ($validated['page'] ?? 1),
            perPage: (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE),
        );
    }
}
