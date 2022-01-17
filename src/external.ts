/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Redis,
    RedisOptions,
} from 'ioredis';

export interface Client extends Redis {

}

export interface ClientOptions extends RedisOptions {

}
