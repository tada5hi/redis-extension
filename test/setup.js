const { GenericContainer } = require('testcontainers');

module.exports = async () => {
    const container = await new GenericContainer('redis:7.2.5').withExposedPorts(6379).start();
    process.env.REDIS_CONNECTION_STRING = `redis://${container.getHost()}:${container.getFirstMappedPort()}`;

    return () => container.stop();
};
