<?php

namespace App\Http\Requests;

class SearchItemsRequest extends ListItemsRequest
{
    protected function prepareForValidation(): void
    {
        $q = $this->query('q');

        if (is_string($q)) {
            $this->merge(['q' => trim($q) === '' ? null : trim($q)]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [...parent::rules(), 'q' => ['nullable', 'string', 'max:100']];
    }
}
