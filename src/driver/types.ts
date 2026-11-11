/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    RedisOptions as ClientOptions,
    ClusterNode,
    ClusterOptions,
} from 'ioredis';

import {
    Redis as Client,
    Cluster,
} from 'ioredis';

export type {
    ClientOptions,
    ClusterOptions,
    ClusterNode,
};

export {
    Client,
    Cluster,
};

export type ClientInput = {
    /**
     * Redis URL, e.g. redis://user:pass@host:6379/0.
     * default: localhost:6379
     */
    url?: string,
    /**
     * ioredis options, applied on top of the package defaults.
     */
    options?: ClientOptions
};

export type ClusterInput = {
    /**
     * Startup nodes, as { host, port } objects or URLs.
     */
    nodes: ClusterNode[],
    /**
     * ioredis cluster options, passed as they are.
     */
    options?: ClusterOptions
};
