<?php

namespace App\Http\Requests;

use App\Support\PersonName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $title = $this->input('title');

        if (is_string($title)) {
            $this->merge(['title' => trim($title)]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:3', 'max:120'],
            'description' => ['required', 'string', 'max:5000'],
            'submitter_name' => ['required', 'string'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $name = $this->input('submitter_name');
                if (! is_string($name) || $validator->errors()->has('submitter_name')) {
                    return;
                }

                $length = mb_strlen(PersonName::normalize($name));
                if ($length < 2 || $length > 60) {
                    $validator->errors()->add('submitter_name', 'The submitter name must be between 2 and 60 characters.');
                }
            },
        ];
    }

    public function submitterName(): string
    {
        return PersonName::normalize($this->validated('submitter_name'));
    }
}
