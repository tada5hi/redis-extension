/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyOptions } from '../type';
import { Client } from '../driver/type';

export type CacheContext = {
    redis: Client
};

export type CacheOptions = KeyOptions & {
    seconds?: number
};
