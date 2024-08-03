/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type CacheOptions = {
    prefix?: string,
    seconds?: number,
    milliseconds?: number,
};

export type CacheOptionsInput = CacheOptions;

export type CacheSetOptions = {
    seconds?: number,
    milliseconds?: number,
    ifNotExists?: boolean, // (NX)
    ifExists?: boolean // (XX)
    keepTTL?: boolean // (KEEPTTL)
};
