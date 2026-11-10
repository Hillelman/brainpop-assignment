<?php

use App\Exceptions\DomainException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

it('returns JSON 404 for unknown api routes', function () {
    $this->getJson('/api/does-not-exist')
        ->assertNotFound()
        ->assertJson(['code' => 'not_found'])
        ->assertJsonStructure(['message', 'code']);
});

it('returns JSON 404 for unknown api routes without an Accept header', function () {
    $this->get('/api/does-not-exist')
        ->assertNotFound()
        ->assertJson(['code' => 'not_found']);
});

it('returns 405 JSON for a wrong method', function () {
    $this->postJson('/api/health')
        ->assertStatus(405)
        ->assertJson(['code' => 'method_not_allowed']);
});

it('returns 500 without a trace for generic exceptions', function () {
    Route::get('/api/_boom', fn () => throw new RuntimeException('secret detail'));

    $this->getJson('/api/_boom')
        ->assertStatus(500)
        ->assertExactJson(['message' => 'Server error', 'code' => 'server_error']);
});

it('maps domain exceptions to their own status and code', function () {
    Route::get('/api/_domain', fn () => throw new class('Nope.', 'custom_code', 418) extends DomainException {});
    Route::get('/api/_conflict', fn () => throw new DomainException);

    $this->getJson('/api/_domain')->assertStatus(418)->assertExactJson(['message' => 'Nope.', 'code' => 'custom_code']);
    $this->getJson('/api/_conflict')->assertStatus(409)->assertJson(['code' => 'conflict']);
});

it('returns 422 with errors for validation failures', function () {
    Route::post('/api/_validate', fn (Request $r) => $r->validate(['title' => 'required']));

    $this->postJson('/api/_validate')
        ->assertStatus(422)
        ->assertJson(['code' => 'validation_failed'])
        ->assertJsonStructure(['message', 'code', 'errors' => ['title']]);
});
