/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import IORedis from 'ioredis';
import { Config, useConfig } from '../config';
import { Cluster, ClusterNode } from './type';

const instanceMap: Record<string, Cluster> = {};

export function useCluster(alias?: string) : Cluster {
    alias = alias || 'default';

    const config = useConfig(alias);

    if (Object.prototype.hasOwnProperty.call(instanceMap, alias)) {
        return instanceMap[alias];
    }

    instanceMap[alias] = createCluster(config);

    return instanceMap[alias];
}

export function createCluster(config?: Config) : Cluster {
    config ??= {};

    let nodes : ClusterNode[] = [];
    if (config.clusterNodes) {
        nodes = config.clusterNodes;
    }

    if (nodes.length === 0) {
        nodes = [config.connectionString];
    }

    return new IORedis.Cluster(
        nodes,
        config.clusterOptions,
    );
}
