/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Redis } from 'ioredis';
import { RedisKeyOptions } from '../type';

export type RedisTrackerContext = {
    redisDatabase: Redis
};

export type RedisTrackerOptions = RedisKeyOptions;

export type RedisTrackerItem<ID> = {
    id: ID,
    score: number
};
