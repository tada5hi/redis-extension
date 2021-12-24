/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Redis } from 'ioredis';
import { EntityBaseOptions, EntityKeyType } from '../type';

export type EntityTrackerContext = {
    redisDatabase: Redis
};

export type EntityTrackerOptions<K extends EntityKeyType> = EntityBaseOptions<K> & {

};

export type EntityTrackerItem<ID> = {
    id: ID,
    score: number
};
