/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Redis,
    Cluster as RedisCluster,
    ClusterNode as RedisClusterNode,
    ClusterOptions as RedisClusterOptions,
    RedisOptions,
} from 'ioredis';

export interface Client extends Redis {

}

export interface ClientOptions extends RedisOptions {

}

// --------------------------------------------------

export interface ClusterOptions extends RedisClusterOptions {

}

export interface Cluster extends RedisCluster {

}

export type ClusterNode = RedisClusterNode;
