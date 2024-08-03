/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires,import/no-extraneous-dependencies
const { GenericContainer } = require('testcontainers');

module.exports = async () => {
    const containerConfig = new GenericContainer('redis:7.2.5')
        .withExposedPorts(6379);

    const container = await containerConfig.start();
    process.env.REDIS_CONNECTION_STRING = `redis://${container.getHost()}:${container.getFirstMappedPort()}`;

    // eslint-disable-next-line no-undef
    globalThis.REDIS_CONTAINER = container;
};
