import { afterAll, beforeAll, describe, expect, it } from 'vitest';
/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Cluster } from '../../../src';
import { JsonAdapter } from '../../../src';
import { connections } from '../../utils/connections';

describe.each(connections)('json-adapter (%s)', (_name, connect) => {
    let client: Client | Cluster;

    beforeAll(async () => {
        client = connect();
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

    it('should resolve undefined for a value that is not json', async () => {
        const adapter = new JsonAdapter(client);
        await client.set('not-json', '{');

        expect(await adapter.get('not-json')).toBeUndefined();

        await adapter.drop('not-json');
    });

    it('should reject when the command fails', async () => {
        const adapter = new JsonAdapter(client);
        await client.sadd('a-set', 'member');

        await expect(adapter.get('a-set')).rejects.toThrow(/WRONGTYPE/);

        await client.del('a-set');
    });
});
