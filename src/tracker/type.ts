/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Redis } from 'ioredis';

export type EntityTrackerIDType = string | number;
export type EntityTrackerKeyType = string | number | Record<string, any>;

export type EntityTrackerContext = {
    redisDatabase: Redis
};

export type EntityTrackerOptions<K extends EntityTrackerKeyType> = {
    keyPrefix?: string,
    keySuffix?: string,
    buildKey?: (key: K) => string
};

export type EntityTrackerItem<ID> = {
    id: ID,
    score: number
};
