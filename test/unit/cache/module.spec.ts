/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../../../src';
import { Cache, createClient } from '../../../src';

describe('src/cache/index.ts', () => {
    let client: Client;

    beforeAll(async () => {
        client = createClient({
            connectionString: process.env.REDIS_CONNECTION_STRING,
        });
    });

    afterAll(async () => {
        client.disconnect();
    });

    it('should create & drop cache', async () => {
        const cache = new Cache(client);

        await cache.set('id', 'abc');
        let cached = await cache.get('id');
        expect(cached).toEqual('abc');

        let isExpired = await cache.isExpired('id');
        expect(isExpired).toEqual(false);

        await cache.drop('id');

        cached = await cache.get('id');
        expect(cached).toEqual(undefined);

        isExpired = await cache.isExpired('id');
        expect(isExpired).toEqual(true);
    });

    it('should cache object', async () => {
        const record = {
            num: 1,
            str: 'string',
            bool: true,
        };
        const cache = new Cache(client);
        await cache.set('id', record);

        const output = await cache.get('id');
        expect(output).toEqual(record);
    });

    it('fire started & stopped event', (done) => {
        expect.assertions(2);

        const cache = new Cache(client);
        cache.on('started', () => {
            expect(true).toBeTruthy();
            cache.stop();
        });

        cache.on('stopped', () => {
            expect(true).toBeTruthy();
            done();
        });

        Promise.resolve()
            .then(() => cache.start());
    });

    it('should fire expired event', (done) => {
        expect.assertions(2);

        const cache = new Cache(client, {
            prefix: 'baz',
        });
        cache.set('foo', 'bar', { milliseconds: 300 });
        cache.on('expired', (result) => {
            expect(result.prefix).toEqual('baz');
            expect(result.id).toEqual('foo');

            cache.stop();

            done();
        });

        Promise.resolve()
            .then(() => cache.start());
    });
});
