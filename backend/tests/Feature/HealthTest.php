<?php

it('reports the API as healthy', function () {
    $this->getJson('/api/health')
        ->assertOk()
        ->assertExactJson([
            'status' => 'ok',
            'checks' => [
                'app_key' => true,
                'clerk' => true,
                'storage_writable' => true,
            ],
        ]);
});
