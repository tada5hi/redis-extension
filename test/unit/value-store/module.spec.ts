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
import { ValueStore } from '../../../src';
import { connections } from '../../utils/connections';

describe.each(connections)('value-store (%s)', (_name, connect) => {
    let client: Client | Cluster;

    beforeAll(async () => {
        client = connect();
    });

    afterAll(async () => {
        client.disconnect();
    });

    it('should set and get value', async () => {
        const store = new ValueStore(client);

        await store.set('id', 'abc');

        let value = await store.get('id');

        expect(value).toEqual('abc');

        await store.drop('id');

        value = await store.get('id');
        expect(value).toEqual(undefined);
    });

    it('should set and get non scalar', async () => {
        const record = {
            num: 1,
            str: 'string',
            bool: true,
        };
        const store = new ValueStore(client);

        await store.set('id', record);

        const output = await store.get('id');

        expect(output).toEqual(record);

        await store.drop('id');
    });

    it('should resolve undefined for a value that is not json', async () => {
        const store = new ValueStore(client);

        await client.set('not-json', '{');

        expect(await store.get('not-json')).toBeUndefined();

        await store.drop('not-json');
    });

    it('should reject when the command fails', async () => {
        const store = new ValueStore(client);

        await client.sadd('a-set', 'member');

        await expect(store.get('a-set')).rejects.toThrow(/WRONGTYPE/);
        await expect(store.getMany(['a-set'])).rejects.toThrow(/WRONGTYPE/);

        await client.del('a-set');
    });

    it('should resolve whether the value was written', async () => {
        const store = new ValueStore(client);

        expect(await store.set('written', 1)).toEqual(true);
        expect(await store.set('written', 2, { ifNotExists: true })).toEqual(false);
        expect(await store.set('not-written', 3, { ifExists: true })).toEqual(false);
        expect(await store.get('written')).toEqual(1);

        await store.drop('written');
    });

    it('should compute and store a missing value once', async () => {
        const store = new ValueStore<{ name: string }>(client);
        let calls = 0;
        const factory = async () => {
            calls++;

            return { name: 'computed' };
        };

        expect(await store.getOrSet('get-or-set', factory, { seconds: 60 })).toEqual({ name: 'computed' });
        expect(await store.getOrSet('get-or-set', factory)).toEqual({ name: 'computed' });
        expect(calls).toEqual(1);
        expect(await client.pttl('get-or-set')).toBeGreaterThan(0);

        await store.drop('get-or-set');
    });

    it('should read and write several values', async () => {
        const store = new ValueStore<number>(client);

        expect(await store.setMany({ 'many:a': 1, 'many:b': 2 })).toEqual([true, true]);
        expect(await store.getMany(['many:a', 'many:missing', 'many:b'])).toEqual([1, undefined, 2]);

        await store.drop('many:a');
        await store.drop('many:b');
    });

    it('should validate values with deserialize', async () => {
        const store = new ValueStore<{ id: number }>(client, {
            deserialize: (text) => {
                const value = JSON.parse(text);

                if (typeof value?.id !== 'number') {
                    throw new TypeError('not a record');
                }

                return { id: value.id };
            },
        });

        await client.set('parse:valid', JSON.stringify({ id: 1, extra: true }));
        await client.set('parse:invalid', JSON.stringify({ id: 'one' }));

        expect(await store.get('parse:valid')).toEqual({ id: 1 });
        expect(await store.get('parse:invalid')).toBeUndefined();
        expect(await store.getMany(['parse:valid', 'parse:invalid'])).toEqual([{ id: 1 }, undefined]);

        await client.del('parse:valid');
        await client.del('parse:invalid');
    });

    it('should revive values with a custom deserialize', async () => {
        const store = new ValueStore<{ at: Date }>(client, {
            deserialize: (text) => JSON.parse(text, (key, value) => (key === 'at' ? new Date(value) : value)),
        });
        const at = new Date('2026-11-11T12:00:00.000Z');

        await store.set('revive', { at });

        const output = await store.get('revive');

        expect(output!.at).toBeInstanceOf(Date);
        expect(output!.at.getTime()).toEqual(at.getTime());

        await store.drop('revive');
    });

    it('should await async serialize and deserialize', async () => {
        const store = new ValueStore<{ id: number }>(client, {
            serialize: async (value) => `v1:${JSON.stringify(value)}`,
            deserialize: async (text) => {
                if (!text.startsWith('v1:')) {
                    throw new TypeError('unknown version');
                }

                return JSON.parse(text.substring(3));
            },
        });

        expect(await store.set('async:a', { id: 1 })).toBe(true);
        expect(await client.get('async:a')).toEqual('v1:{"id":1}');
        expect(await store.get('async:a')).toEqual({ id: 1 });

        await client.set('async:b', '{"id":2}');

        expect(await store.get('async:b')).toBeUndefined();
        expect(await store.getMany(['async:a', 'async:b'])).toEqual([{ id: 1 }, undefined]);
        expect(await store.getOrSet('async:b', () => ({ id: 3 }))).toEqual({ id: 3 });
        expect(await store.get('async:b')).toEqual({ id: 3 });

        await client.del('async:a');
        await client.del('async:b');
    });

    it('should reject when an async serialize resolves no string', async () => {
        const store = new ValueStore(client, {
            serialize: async () => undefined as unknown as string,
        });

        await expect(store.set('async:none', 1)).rejects.toThrow(TypeError);
        expect(await client.exists('async:none')).toBe(0);
    });

    it('should resolve the stored value when a concurrent getOrSet wins', async () => {
        const store = new ValueStore<string>(client);
        const slow = (value: string) => async () => {
            await new Promise((resolve) => {
                setTimeout(resolve, 20); 
            });

            return value;
        };

        const results = await Promise.all([
            store.getOrSet('race', slow('A'), { ifNotExists: true }),
            store.getOrSet('race', slow('B'), { ifNotExists: true }),
        ]);

        const stored = await store.get('race');

        expect(results).toEqual([stored, stored]);

        await store.drop('race');
    });

    it('should replace an unreadable value with ifNotExists', async () => {
        const store = new ValueStore<{ id: number }>(client);
        let calls = 0;
        const factory = () => {
            calls++;

            return { id: 1 };
        };

        await client.set('unreadable', '{', 'PX', 60000);

        expect(await store.getOrSet('unreadable', factory, { ifNotExists: true, seconds: 30 })).toEqual({ id: 1 });
        expect(await store.getOrSet('unreadable', factory, { ifNotExists: true, seconds: 30 })).toEqual({ id: 1 });
        expect(calls).toEqual(1);

        const ttl = await client.pttl('unreadable');

        expect(ttl).toBeGreaterThan(0);
        expect(ttl).toBeLessThanOrEqual(30000);

        await store.drop('unreadable');
    });

    it('should keep a valid value written while replacing an unreadable one', async () => {
        const store = new ValueStore<{ id: number }>(client);

        await client.set('unreadable:race', '{');

        const output = await store.getOrSet('unreadable:race', async () => {
            // a concurrent caller stores a valid value first
            await client.set('unreadable:race', JSON.stringify({ id: 2 }));

            return { id: 1 };
        }, { ifNotExists: true });

        expect(output).toEqual({ id: 2 });
        expect(await store.get('unreadable:race')).toEqual({ id: 2 });

        await store.drop('unreadable:race');
    });

    it('should reject a value that cannot be serialized', async () => {
        const store = new ValueStore(client);

        await expect(store.set('undefined', undefined)).rejects.toThrow(TypeError);
        await expect(store.getOrSet('undefined', () => undefined)).rejects.toThrow(TypeError);
        expect(await client.exists('undefined')).toEqual(0);
    });

    it('should accept fractional time to live values', async () => {
        const store = new ValueStore(client);

        expect(await store.set('fraction:seconds', 1, { seconds: 1.0005 })).toEqual(true);
        expect(await store.set('fraction:milliseconds', 1, { milliseconds: 1500.5 })).toEqual(true);
        expect(await client.pttl('fraction:seconds')).toBeGreaterThan(0);

        await store.drop('fraction:seconds');
        await store.drop('fraction:milliseconds');
    });
});
