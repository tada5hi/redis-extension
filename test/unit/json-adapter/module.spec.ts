import { 
    afterAll, 
    beforeAll, 
    describe, 
    expect, 
    it, 
} from 'vitest';
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

    it('should resolve whether the value was written', async () => {
        const adapter = new JsonAdapter(client);

        expect(await adapter.set('written', 1)).toEqual(true);
        expect(await adapter.set('written', 2, { ifNotExists: true })).toEqual(false);
        expect(await adapter.set('not-written', 3, { ifExists: true })).toEqual(false);
        expect(await adapter.get('written')).toEqual(1);

        await adapter.drop('written');
    });

    it('should compute and store a missing value once', async () => {
        const adapter = new JsonAdapter<{ name: string }>(client);
        let calls = 0;
        const factory = async () => {
            calls++;

            return { name: 'computed' };
        };

        expect(await adapter.getOrSet('get-or-set', factory, { seconds: 60 })).toEqual({ name: 'computed' });
        expect(await adapter.getOrSet('get-or-set', factory)).toEqual({ name: 'computed' });
        expect(calls).toEqual(1);
        expect(await client.pttl('get-or-set')).toBeGreaterThan(0);

        await adapter.drop('get-or-set');
    });

    it('should read and write several values', async () => {
        const adapter = new JsonAdapter<number>(client);

        expect(await adapter.setMany({ 'many:a': 1, 'many:b': 2 })).toEqual([true, true]);
        expect(await adapter.getMany(['many:a', 'many:missing', 'many:b'])).toEqual([1, undefined, 2]);

        await adapter.drop('many:a');
        await adapter.drop('many:b');
    });

    it('should validate values with parse', async () => {
        const adapter = new JsonAdapter<{ id: number }>(client, {
            parse: (value) => {
                if (typeof value !== 'object' || value === null || typeof (value as { id?: unknown }).id !== 'number') {
                    throw new TypeError('not a record');
                }

                return { id: (value as { id: number }).id };
            },
        });

        await client.set('parse:valid', JSON.stringify({ id: 1, extra: true }));
        await client.set('parse:invalid', JSON.stringify({ id: 'one' }));

        expect(await adapter.get('parse:valid')).toEqual({ id: 1 });
        expect(await adapter.get('parse:invalid')).toBeUndefined();
        expect(await adapter.getMany(['parse:valid', 'parse:invalid'])).toEqual([{ id: 1 }, undefined]);

        await client.del('parse:valid');
        await client.del('parse:invalid');
    });

    it('should use a custom serializer', async () => {
        const adapter = new JsonAdapter<{ at: Date }>(client, {
            serializer: {
                stringify: (value) => JSON.stringify(value),
                parse: (text) => JSON.parse(text, (key, value) => (key === 'at' ? new Date(value) : value)),
            },
        });
        const at = new Date('2026-11-11T12:00:00.000Z');

        await adapter.set('serializer', { at });

        const output = await adapter.get('serializer');

        expect(output!.at).toBeInstanceOf(Date);
        expect(output!.at.getTime()).toEqual(at.getTime());

        await adapter.drop('serializer');
    });

    it('should resolve the stored value when a concurrent getOrSet wins', async () => {
        const adapter = new JsonAdapter<string>(client);
        const slow = (value: string) => async () => {
            await new Promise((resolve) => {
                setTimeout(resolve, 20); 
            });

            return value;
        };

        const results = await Promise.all([
            adapter.getOrSet('race', slow('A'), { ifNotExists: true }),
            adapter.getOrSet('race', slow('B'), { ifNotExists: true }),
        ]);

        const stored = await adapter.get('race');

        expect(results).toEqual([stored, stored]);

        await adapter.drop('race');
    });

    it('should reject a value that cannot be serialized', async () => {
        const adapter = new JsonAdapter(client);

        await expect(adapter.set('undefined', undefined)).rejects.toThrow(TypeError);
        await expect(adapter.getOrSet('undefined', () => undefined)).rejects.toThrow(TypeError);
        expect(await client.exists('undefined')).toEqual(0);
    });

    it('should accept fractional time to live values', async () => {
        const adapter = new JsonAdapter(client);

        expect(await adapter.set('fraction:seconds', 1, { seconds: 1.0005 })).toEqual(true);
        expect(await adapter.set('fraction:milliseconds', 1, { milliseconds: 1500.5 })).toEqual(true);
        expect(await client.pttl('fraction:seconds')).toBeGreaterThan(0);

        await adapter.drop('fraction:seconds');
        await adapter.drop('fraction:milliseconds');
    });
});
