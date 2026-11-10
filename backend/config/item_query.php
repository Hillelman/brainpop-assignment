<?php

use App\Queries\Filters\CreatedFromFilter;
use App\Queries\Filters\CreatedToFilter;
use App\Queries\Filters\RiskFilter;
use App\Queries\Filters\StatusFilter;
use App\Queries\Filters\SubmitterFilter;
use App\Queries\Sorts\CreatedAtSort;
use App\Queries\Sorts\RiskSort;
use App\Queries\Sorts\TitleSort;
use App\Queries\Sorts\UpdatedAtSort;

/*
 * The single registry for item list filters and sorts. To add one, create the class and list it here.
 */
return [
    'filters' => [
        StatusFilter::class,
        RiskFilter::class,
        SubmitterFilter::class,
        CreatedFromFilter::class,
        CreatedToFilter::class,
    ],

    'sorts' => [
        CreatedAtSort::class,
        UpdatedAtSort::class,
        TitleSort::class,
        RiskSort::class,
    ],
];
