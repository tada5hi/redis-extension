const { GenericContainer } = require('testcontainers');

async function startCluster() {
    const container = await new GenericContainer('redis:7.2.5')
        .withCommand(['redis-server', '--cluster-enabled', 'yes', '--appendonly', 'no'])
        .withExposedPorts(6379)
        .start();

    // announce the container address, so the cluster can be reached through a NAT mapping
    const [network] = container.getNetworkNames();
    const ip = container.getIpAddress(network);
    await container.exec(['redis-cli', 'config', 'set', 'cluster-announce-ip', ip]);
    await container.exec(['redis-cli', 'cluster', 'addslotsrange', '0', '16383']);

    for (let i = 0; i < 50; i++) {
        const { output } = await container.exec(['redis-cli', 'cluster', 'info']);
        if (output.includes('cluster_state:ok')) {
            break;
        }

        await new Promise((resolve) => { setTimeout(resolve, 100); });
    }

    process.env.REDIS_CLUSTER_HOST = container.getHost();
    process.env.REDIS_CLUSTER_PORT = `${container.getFirstMappedPort()}`;
    process.env.REDIS_CLUSTER_ANNOUNCED = `${ip}:6379`;

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
