/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyOptions, KeyReference } from '../type';
import { Client } from '../driver/type';

export type CacheContext = {
    redis: Client
};

export type CacheOptions<
    K extends string | number = string | number,
    O extends KeyReference = never,
> = KeyOptions<K, O> & {
    seconds?: number
};
