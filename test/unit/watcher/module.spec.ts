/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../../../src';
import { Watcher, createClient } from '../../../src';

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

    it('should set and get value', async () => {
        const watcher = new Watcher(client);

        await watcher.set('id', 'abc');
        let value = await watcher.get('id');
        expect(value).toEqual('abc');

        let isExpired = await watcher.isExpired('id');
        expect(isExpired).toEqual(false);

        await watcher.drop('id');

        value = await watcher.get('id');
        expect(value).toEqual(undefined);

        isExpired = await watcher.isExpired('id');
        expect(isExpired).toEqual(true);
    });

    it('should set with ifNotExists options', async () => {
        const watcher = new Watcher(client);

        await watcher.set('id', 'foo');

        let value = await watcher.get('id');
        expect(value).toEqual('foo');

        await watcher.set('id', 'bar', { ifNotExists: true });
        value = await watcher.get('id');
        expect(value).toEqual('foo');

        await watcher.drop('id');
    });

    it('should set with ifExists options', async () => {
        const watcher = new Watcher(client);

        await watcher.set('id', 'foo', { ifExists: true });

        const value = await watcher.get('id');
        expect(value).toBeUndefined();
    });

    it('should set and get object', async () => {
        const record = {
            num: 1,
            str: 'string',
            bool: true,
        };
        const watcher = new Watcher(client);
        await watcher.set('id', record);

        const output = await watcher.get('id');
        expect(output).toEqual(record);

        await watcher.drop('id');
    });

    it('fire started & stopped event', (done) => {
        expect.assertions(2);

        const watcher = new Watcher(client);
        watcher.on('started', () => {
            expect(true).toBeTruthy();
            watcher.stop();
        });

        watcher.on('stopped', () => {
            expect(true).toBeTruthy();
            done();
        });

        Promise.resolve()
            .then(() => watcher.start());
    });

    it('should fire expired event', (done) => {
        expect.assertions(2);

        const watcher = new Watcher(client, {
            prefix: 'baz',
        });
        watcher.set('foo', 'bar', { milliseconds: 300 });
        watcher.on('expired', (result) => {
            expect(result.prefix).toEqual('baz');
            expect(result.id).toEqual('foo');

            watcher.stop();

            done();
        });

        Promise.resolve()
            .then(() => watcher.start());
    });
});
