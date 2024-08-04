/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../../../src';
import { Watcher, createClient, stringifyKey } from '../../../src';

describe('watcher', () => {
    let client: Client;

    beforeAll(async () => {
        client = createClient({
            connectionString: process.env.REDIS_CONNECTION_STRING,
        });
    });

    afterAll(async () => {
        client.disconnect();
    });

    it('should watch specific key', (done) => {
        expect.assertions(3);

        const key = stringifyKey({
            prefix: 'prefix',
            id: 'key',
            suffix: 'suffix',
        });
        const watcher = new Watcher(client, {
            pattern: key,
        });

        watcher.on('error', (err) => {
            done(err);
        });
        watcher.on('set', (result) => {
            expect(result.prefix).toEqual('prefix');
            expect(result.id).toEqual('key');
            expect(result.suffix).toEqual('suffix');

            watcher.stop();

            done();
        });

        Promise.resolve()
            .then(() => watcher.start())
            .then(() => client.set(key, 'bar', 'PX', 300));
    });

    it('should watch and fire expired event', (done) => {
        expect.assertions(1);

        const watcher = new Watcher(client);
        watcher.on('expire', (result) => {
            expect(result.id).toEqual('foo');

            watcher.stop();

            done();
        });

        Promise.resolve()
            .then(() => watcher.start())
            .then(() => client.set('foo', 'bar', 'PX', 300));
    });

    it('should watch fire del event', (done) => {
        expect.assertions(1);

        const watcher = new Watcher(client);
        watcher.on('del', (result) => {
            expect(result.id).toEqual('foo');

            watcher.stop();

            done();
        });

        Promise.resolve()
            .then(() => watcher.start())
            .then(() => client.set('foo', 'bar'))
            .then(() => client.del('foo'));
    });
});
