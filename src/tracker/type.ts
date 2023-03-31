/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Redis } from 'ioredis';
import type { KeyOptions, KeyReference } from '../type';

export type TrackerContext = {
    redis: Redis
};

export type TrackerItem<ID> = {
    id: ID,
    score: number
};

export type TrackerOptions<
    K extends string | number = string | number,
    O extends KeyReference = never,
    > = KeyOptions<K, O>;
