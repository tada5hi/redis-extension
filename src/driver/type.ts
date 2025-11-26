/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    RedisOptions as ClientOptions,
    ClusterOptions,
} from 'ioredis';

import {
    Redis as Client,
    Cluster,
    ClusterNode,
} from 'ioredis';

export type {
    ClientOptions,
    ClusterOptions,
};

export {
    Client,
    Cluster,
    ClusterNode,
};
