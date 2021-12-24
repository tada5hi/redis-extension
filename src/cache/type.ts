/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Redis } from 'ioredis';
import { EntityKeyType } from '../type';

export type EntityCacheContext = {
    redisDatabase: Redis
};

export type EntityCacheOptions<K extends EntityKeyType> = {
    buildPath?: (key: K) => string
};
