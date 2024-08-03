/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../../../src';
import { JsonAdapter, createClient } from '../../../src';

describe('json-adapter', () => {
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
        const watcher = new JsonAdapter(client);

        await watcher.set('id', 'abc');
        let value = await watcher.get('id');
        expect(value).toEqual('abc');

        await watcher.drop('id');

        value = await watcher.get('id');
        expect(value).toEqual(undefined);
    });

    it('should set and get non scalar', async () => {
        const record = {
            num: 1,
            str: 'string',
            bool: true,
        };
        const watcher = new JsonAdapter(client);
        await watcher.set('id', record);

        const output = await watcher.get('id');
        expect(output).toEqual(record);

        await watcher.drop('id');
    });
});
