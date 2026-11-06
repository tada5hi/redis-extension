import { once } from 'node:events';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from '../../../src';
import { Watcher, buildKeyPath, createClient } from '../../../src';

describe('watcher', () => {
    let client: Client;

    beforeAll(() => {
        client = createClient({ connectionString: process.env.REDIS_CONNECTION_STRING });
    });

    afterAll(() => {
        client.disconnect();
    });

    it('should watch specific key', async () => {
        const keyPath = buildKeyPath({ prefix: 'prefix', key: 'key', suffix: 'suffix' });
        const watcher = new Watcher(client, { pattern: keyPath });

        try {
            await watcher.start();
            const event = once(watcher, 'set');
            await client.set(keyPath, 'bar', 'PX', 300);
            const [key] = await event;
            expect(key).toEqual(keyPath);
        } finally {
            await watcher.stop();
        }
    });

    it('should watch and fire set & expire event', async () => {
        const watcher = new Watcher(client, { pattern: 'foo' });

        try {
            await watcher.start();
            const events = Promise.all([once(watcher, 'set'), once(watcher, 'expired')]);
            await client.set('foo', 'bar', 'PX', 300);
            const [[setKey], [expiredKey]] = await events;
            expect(setKey).toEqual('foo');
            expect(expiredKey).toEqual('foo');
        } finally {
            await watcher.stop();
        }
    });

    it('should watch fire set & del event', async () => {
        const watcher = new Watcher(client, { pattern: 'foo' });

        try {
            await watcher.start();
            const events = Promise.all([once(watcher, 'set'), once(watcher, 'del')]);
            await client.set('foo', 'bar');
            await client.del('foo');
            const [[setKey], [deletedKey]] = await events;
            expect(setKey).toEqual('foo');
            expect(deletedKey).toEqual('foo');
        } finally {
            await watcher.stop();
        }
    });
});
