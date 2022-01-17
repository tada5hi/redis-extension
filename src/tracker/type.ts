/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Redis } from 'ioredis';
import { KeyOptions } from '../type';

export type TrackerContext = {
    redis: Redis
};

export type TrackerOptions = KeyOptions;

export type TrackerItem<ID> = {
    id: ID,
    score: number
};
