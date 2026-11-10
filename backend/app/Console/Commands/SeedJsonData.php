<?php

namespace App\Console\Commands;

use App\Enums\ItemStatus;
use App\Enums\ReviewDecision;
use App\Enums\RiskLevel;
use App\Repositories\Contracts\ItemRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Contracts\UserRepository;
use Carbon\CarbonImmutable;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Random\Engine\Mt19937;
use Random\Randomizer;

#[Signature('app:seed-json {--count=50 : Number of items to create} {--fresh : Delete existing JSON data first} {--seed= : Integer seed for deterministic output}')]
#[Description('Seed the JSON storage with demo users, items and reviews')]
class SeedJsonData extends Command
{
    private const USERS = [
        ['seed_user_1', 'Alice Johnson', 'alice@example.com'],
        ['seed_user_2', 'Bob Smith', 'bob@example.com'],
        ['seed_user_3', 'Carol Davis', 'carol@example.com'],
    ];

    private const SUBJECTS = ['Login page', 'Checkout flow', 'Search index', 'Profile photo', 'Billing export', 'Email template', 'API gateway', 'Dashboard widget', 'Onboarding tour', 'Comment thread'];

    private const CHANGES = ['redesign', 'performance fix', 'accessibility audit', 'copy update', 'security patch', 'new feature', 'refactor', 'bug report'];

    private const NOTES = ['Looks good.', 'Needs more detail.', 'Violates guidelines.', 'Checked and verified.', null];

    public function handle(UserRepository $users, ItemRepository $items, ReviewRepository $reviews): int
    {
        $count = (int) $this->option('count');
        if ($count < 0) {
            $this->error('The --count option must not be negative.');

            return self::FAILURE;
        }

        if ($this->option('fresh')) {
            $path = (string) config('storage_json.path');
            foreach (['users', 'items', 'reviews'] as $collection) {
                File::delete("{$path}/{$collection}.json");
            }
        }

        $seed = $this->option('seed');
        $random = new Randomizer(new Mt19937($seed === null || $seed === '' ? null : (int) $seed));

        $userIds = array_map(
            fn (array $user): int => $users->upsertFromClerk(...$user)->id,
            self::USERS,
        );

        $now = CarbonImmutable::now('UTC');
        $statuses = ItemStatus::cases();
        $risks = RiskLevel::cases();

        for ($i = 0; $i < $count; $i++) {
            $status = $statuses[$i % count($statuses)];
            $createdAt = $now->subMinutes($random->getInt(60, 60 * 24 * 30));
            $subject = self::SUBJECTS[$random->getInt(0, count(self::SUBJECTS) - 1)];
            $change = self::CHANGES[$random->getInt(0, count(self::CHANGES) - 1)];
            $submitterId = $userIds[$random->getInt(0, count($userIds) - 1)];

            $item = $items->create([
                'title' => "{$subject}: {$change} #".($i + 1),
                'description' => "Please review the {$change} proposed for the {$subject}.",
                'submitter_id' => $submitterId,
                'created_at' => $createdAt,
            ]);

            if (! $status->isReviewed()) {
                continue;
            }

            $decision = $status === ItemStatus::Approved ? ReviewDecision::Approved : ReviewDecision::Rejected;
            $risk = $risks[$random->getInt(0, count($risks) - 1)];
            $reviewedAt = $createdAt->addMinutes($random->getInt(1, 60 * 24));
            $reviewerId = $userIds[($random->getInt(0, count($userIds) - 1) + 1) % count($userIds)];

            $items->updateMany([$item->id => $item->withReview($decision, $risk, $reviewedAt)]);
            $reviews->create([
                'item_id' => $item->id,
                'reviewer_id' => $reviewerId,
                'decision' => $decision,
                'risk' => $risk,
                'note' => self::NOTES[$random->getInt(0, count(self::NOTES) - 1)],
                'created_at' => $reviewedAt,
            ]);
        }

        $this->info("Seeded {$count} items for ".count($userIds).' users.');

        return self::SUCCESS;
    }
}
