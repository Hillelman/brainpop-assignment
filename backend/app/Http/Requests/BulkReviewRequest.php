<?php

namespace App\Http\Requests;

use App\DTOs\BulkReviewData;
use App\Enums\ReviewDecision;
use App\Enums\RiskLevel;
use App\Support\PersonName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class BulkReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $note = $this->input('note');

        if (is_string($note)) {
            $trimmed = trim($note);
            $this->merge(['note' => $trimmed === '' ? null : $trimmed]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['required', 'integer', 'min:1'],
            'decision' => ['required', Rule::enum(ReviewDecision::class)],
            'risk' => ['nullable', Rule::enum(RiskLevel::class)],
            'note' => ['nullable', 'string', 'max:1000'],
            'reviewer_name' => ['required', 'string'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $name = $this->input('reviewer_name');
                if (! is_string($name) || $validator->errors()->has('reviewer_name')) {
                    return;
                }

                $length = mb_strlen(PersonName::normalize($name));
                if ($length < 2 || $length > 60) {
                    $validator->errors()->add('reviewer_name', 'The reviewer name must be between 2 and 60 characters.');
                }
            },
        ];
    }

    public function reviewerName(): string
    {
        return PersonName::normalize($this->validated('reviewer_name'));
    }

    public function toData(): BulkReviewData
    {
        $risk = $this->validated('risk');

        return new BulkReviewData(
            ids: array_values(array_unique(array_map('intval', $this->validated('ids')))),
            decision: ReviewDecision::from($this->validated('decision')),
            risk: $risk === null ? null : RiskLevel::from($risk),
            note: $this->validated('note'),
        );
    }
}
