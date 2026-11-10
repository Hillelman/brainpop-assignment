<?php

it('no longer requires the JWT library', function () {
    $composer = json_decode(file_get_contents(base_path('composer.json')), true);

    expect($composer['require'])->not->toHaveKey('firebase/php-jwt');
});
