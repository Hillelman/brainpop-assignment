<?php

return [
    'secret_key' => env('CLERK_SECRET_KEY'),
    'jwks_url' => env('CLERK_JWKS_URL'),
    'issuer' => env('CLERK_ISSUER'),
    'authorized_parties' => array_values(array_filter(
        array_map('trim', explode(',', (string) env('CLERK_AUTHORIZED_PARTIES', ''))),
    )),
];
