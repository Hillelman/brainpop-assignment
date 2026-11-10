<?php

use App\Support\PersonName;

it('trims and collapses whitespace when normalizing', function (string $input, string $expected) {
    expect(PersonName::normalize($input))->toBe($expected);
})->with([
    ['  Ana   Lopez ', 'Ana Lopez'],
    ["Ana\t\nLopez", 'Ana Lopez'],
    ['   ', ''],
    ['José', 'José'],
]);

it('builds a case-insensitive key that preserves accents', function () {
    expect(PersonName::key(' Ana   LOPEZ '))->toBe('ana lopez')
        ->and(PersonName::key('JOSÉ'))->toBe('josé')
        ->and(PersonName::key('José'))->not->toBe(PersonName::key('Jose'));
});
