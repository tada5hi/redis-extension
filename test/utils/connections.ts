import type { Client, Cluster } from '../../src';
import { createClient, createCluster } from '../../src';

function createTestCluster(): Cluster {
    const host = process.env.REDIS_CLUSTER_HOST!;
    const nodes = JSON.parse(process.env.REDIS_CLUSTER_NODES!) as { announced: string, port: number }[];

    return createCluster({
        nodes: nodes.map(({ port }) => ({ host, port })),
        options: {
            // the nodes announce their container address; route it to the published ports
            natMap: Object.fromEntries(nodes.map(({ announced, port }) => [announced, { host, port }])),
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
