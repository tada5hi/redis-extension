import type { Client, Cluster } from '../../src';
import { createClient, createCluster } from '../../src';

function createTestCluster(): Cluster {
    const host = process.env.REDIS_CLUSTER_HOST!;
    const port = Number(process.env.REDIS_CLUSTER_PORT);

    return createCluster({
        nodes: [{ host, port }],
        options: {
            // the node announces its container address; route it to the published port
            natMap: { [process.env.REDIS_CLUSTER_ANNOUNCED!]: { host, port } },
        },
    });
}

/**
 * The two adapters the helpers accept: a single node and a cluster.
 */
export const connections: [string, () => Client | Cluster][] = [
    ['client', () => createClient({ url: process.env.REDIS_CONNECTION_STRING })],
    ['cluster', createTestCluster],
];
