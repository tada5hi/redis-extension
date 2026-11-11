/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Cluster } from 'ioredis';
import type { ClusterNode, ConfigInput } from './types';

export function createCluster(input: ConfigInput = {}) : Cluster {
    let nodes : ClusterNode[] = input.clusterNodes || [];

    if (
        nodes.length === 0 &&
        input.connectionString
    ) {
        nodes = [input.connectionString];
    }

    return new Cluster(nodes, input.clusterOptions);
}
