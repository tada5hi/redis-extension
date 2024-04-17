/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Cluster } from 'ioredis';
import type { ConfigInput } from '../config';
import { buildConfig, useConfig } from '../config';
import type { ClusterNode } from './type';

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

export function createCluster(input?: ConfigInput) : Cluster {
    const config = buildConfig(input);

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

    return new Cluster(
        nodes,
        config.clusterOptions,
    );
}
