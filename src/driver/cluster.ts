/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import IORedis from 'ioredis';
import type { Config } from '../config';
import { useConfig } from '../config';
import type { Cluster, ClusterNode } from './type';

const getAlias = (alias?: string) => alias || 'default';

const instances: Record<string, Cluster> = {};

export function useCluster(alias?: string) : Cluster {
    alias = getAlias(alias);

    const config = useConfig(alias);

    if (Object.prototype.hasOwnProperty.call(instances, alias)) {
        return instances[alias];
    }

    instances[alias] = createCluster(config);

    return instances[alias];
}

export function setCluster(value: Cluster, alias?: string) : Cluster {
    alias = getAlias(alias);

    instances[alias] = value;

    return instances[alias];
}

export function hasCluster(alias?: string) {
    alias = getAlias(alias);

    return Object.prototype.hasOwnProperty.call(instances, alias);
}

export function createCluster(config?: Config) : Cluster {
    config ??= {};

    let nodes : ClusterNode[] = [];
    if (config.clusterNodes) {
        nodes = config.clusterNodes;
    }

    if (
        nodes.length === 0 &&
        config.connectionString
    ) {
        nodes = [config.connectionString];
    }

    return new IORedis.Cluster(
        nodes,
        config.clusterOptions,
    );
}
