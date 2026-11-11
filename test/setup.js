const { GenericContainer } = require('testcontainers');

const CLUSTER_PORTS = [7000, 7001, 7002];
const CLUSTER_SLOTS = [['0', '5460'], ['5461', '10922'], ['10923', '16383']];

/**
 * Start a Redis Cluster with three masters, one redis-server per port in one
 * container, so keys spread over nodes like in production.
 */
async function startCluster() {
    const servers = CLUSTER_PORTS
        .map((port) => `redis-server --port ${port} --cluster-enabled yes --cluster-config-file nodes-${port}.conf --appendonly no --daemonize yes`)
        .join(' && ');

    const container = await new GenericContainer('redis:7.2.5')
        .withEntrypoint(['sh', '-c'])
        .withCommand([`${servers} && tail -f /dev/null`])
        .withExposedPorts(...CLUSTER_PORTS)
        .start();

    const cli = async (port, ...args) => {
        const { output, exitCode } = await container.exec(['redis-cli', '-p', `${port}`, ...args]);

        if (exitCode !== 0) {
            throw new Error(`redis-cli -p ${port} ${args.join(' ')}: ${output}`);
        }

        return output;
    };

    // announce the container address, so the nodes can be reached through a NAT mapping
    const [network] = container.getNetworkNames();
    const ip = container.getIpAddress(network);

    for (const [i, CLUSTER_PORT] of CLUSTER_PORTS.entries()) {
        await cli(CLUSTER_PORT, 'config', 'set', 'cluster-announce-ip', ip);
        await cli(CLUSTER_PORT, 'cluster', 'addslotsrange', ...CLUSTER_SLOTS[i]);
    }

    for (const port of CLUSTER_PORTS.slice(1)) {
        await cli(CLUSTER_PORTS[0], 'cluster', 'meet', ip, `${port}`);
    }

    for (let i = 0; i < 100; i++) {
        const states = await Promise.all(CLUSTER_PORTS.map((port) => cli(port, 'cluster', 'info')));

        if (states.every((state) => state.includes('cluster_state:ok') && state.includes('cluster_known_nodes:3'))) {
            break;
        }

        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });
    }

    process.env.REDIS_CLUSTER_HOST = container.getHost();
    process.env.REDIS_CLUSTER_NODES = JSON.stringify(CLUSTER_PORTS.map((port) => ({
        announced: `${ip}:${port}`,
        port: container.getMappedPort(port),
    })));

    return container;
}

module.exports = async () => {
    const [container, cluster] = await Promise.all([
        new GenericContainer('redis:7.2.5').withExposedPorts(6379).start(),
        startCluster(),
    ]);

    process.env.REDIS_CONNECTION_STRING = `redis://${container.getHost()}:${container.getFirstMappedPort()}`;

    return () => Promise.all([container.stop(), cluster.stop()]);
};
