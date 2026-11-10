<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // No .env exists under test, so give the API the minimum configuration it requires.
        config(['app.key' => 'base64:'.base64_encode(str_repeat('k', 32))]);
    }
}
