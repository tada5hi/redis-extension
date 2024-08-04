/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../../../src';
import { Watcher, buildKeyPath, createClient } from '../../../src';

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
        expect.assertions(1);

        const keyPath = buildKeyPath({
            prefix: 'prefix',
            key: 'key',
            suffix: 'suffix',
        });
        const watcher = new Watcher(client, {
            pattern: keyPath,
        });

        watcher.on('error', (err) => {
            done(err);
        });
        watcher.on('set', (key) => {
            expect(key).toEqual(keyPath);

            watcher.stop();

            done();
        });

        Promise.resolve()
            .then(() => watcher.start())
            .then(() => client.set(keyPath, 'bar', 'PX', 300));
    });

    it('should watch and fire set & expire event', (done) => {
        expect.assertions(2);

        const watcher = new Watcher(client);
        watcher.on('set', (key) => {
            expect(key).toEqual('foo');
        });
        watcher.on('expire', (key) => {
            expect(key).toEqual('foo');

            watcher.stop();

            done();
        });

        Promise.resolve()
            .then(() => watcher.start())
            .then(() => client.set('foo', 'bar', 'PX', 300));
    });

    it('should watch fire set & del event', (done) => {
        expect.assertions(2);

        const watcher = new Watcher(client);
        watcher.on('set', (key) => {
            expect(key).toEqual('foo');
        });

        watcher.on('del', (key) => {
            expect(key).toEqual('foo');

            watcher.stop();

            done();
        });

        Promise.resolve()
            .then(() => watcher.start())
            .then(() => client.set('foo', 'bar'))
            .then(() => client.del('foo'));
    });
});
