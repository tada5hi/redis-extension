import { once } from 'node:events';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { Client } from '../../../src';
import {
    Watcher,
    WatcherEvent,
    buildKeyPath,
    createClient,
} from '../../../src';

describe('watcher', () => {
    let client: Client;

    beforeAll(() => {
        client = createClient({ url: process.env.REDIS_CONNECTION_STRING });
    });

    afterAll(() => {
        client.disconnect();
    });

    it('should watch specific key', async () => {
        const keyPath = buildKeyPath({
            prefix: 'prefix',
            key: 'key',
            suffix: 'suffix',
        });
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

    it('should type the expired event', async () => {
        const watcher = new Watcher(client, { pattern: 'typed' });

        try {
            await watcher.start();

            const expired = new Promise<string>((resolve) => {
                watcher.on(WatcherEvent.EXPIRED, resolve);
            });

            await client.set('typed', 'bar', 'PX', 100);
            expect(await expired).toEqual('typed');
        } finally {
            await watcher.stop();
        }
    });

    it('should not configure the server when notifyKeyspaceEvents is false', async () => {
        await client.config('SET', 'notify-keyspace-events', 'Kg$');

        const watcher = new Watcher(client, { pattern: 'manual', notifyKeyspaceEvents: false });

        try {
            await watcher.start();
            expect(await client.config('GET', 'notify-keyspace-events')).toEqual(['notify-keyspace-events', 'g$K']);

            const event = once(watcher, 'set');

            await client.set('manual', 'bar');

            const [key] = await event;

            expect(key).toEqual('manual');
        } finally {
            await watcher.stop();
            await client.config('SET', 'notify-keyspace-events', '');
        }
    });

    it('should close the subscriber connection when start fails', async () => {
        // other spec files share the server, so count only this test's connections
        const named = createClient({
            url: process.env.REDIS_CONNECTION_STRING,
            options: { connectionName: 'watcher-start-fails' },
        });
        const countConnections = async () => (await named.client('LIST') as string)
            .split('\n')
            .filter((line) => line.includes(' name=watcher-start-fails ')).length;

        try {
            await named.ping();

            const before = await countConnections();
            const watcher = new Watcher(named, { notifyKeyspaceEvents: 'not-a-flag' });

            await expect(watcher.start()).rejects.toThrow();
            await new Promise((resolve) => {
                setTimeout(resolve, 100);
            });

            expect(await countConnections()).toEqual(before);
        } finally {
            named.disconnect();
        }
    });

    it('should apply the client keyPrefix to patterns and keys', async () => {
        const prefixed = createClient({ url: process.env.REDIS_CONNECTION_STRING, options: { keyPrefix: 'app:' } });
        const watcher = new Watcher(prefixed, { pattern: 'prefixed:*' });

        try {
            await watcher.start();

            const event = once(watcher, 'set');

            await prefixed.set('prefixed:1', 'bar');

            const [key] = await event;

            expect(key).toEqual('prefixed:1');
        } finally {
            await watcher.stop();
            await prefixed.del('prefixed:1');
            prefixed.disconnect();
        }
    });

    it('should only emit keys of the client database', async () => {
        const db1 = createClient({ url: `${process.env.REDIS_CONNECTION_STRING}/1` });
        const watcher = new Watcher(db1, { pattern: 'database:*' });
        const keys: string[] = [];

        watcher.on('set', (key) => keys.push(key));

        try {
            await watcher.start();
            await client.set('database:from-db0', 'x');
            await db1.set('database:from-db1', 'x');
            await new Promise((resolve) => {
                setTimeout(resolve, 200);
            });
            expect(keys).toEqual(['database:from-db1']);
        } finally {
            await watcher.stop();
            await client.del('database:from-db0');
            await db1.del('database:from-db1');
            db1.disconnect();
        }
    });

    it('should not match a pattern across the channel separator', async () => {
        const watcher = new Watcher(client, { pattern: 'separator:*' });
        const keys: string[] = [];

        watcher.on('set', (key) => keys.push(key));

        try {
            await watcher.start();
            await client.set('other__:separator:1', 'x');
            await client.set('separator:2', 'x');
            await new Promise((resolve) => {
                setTimeout(resolve, 200);
            });
            expect(keys).toEqual(['separator:2']);
        } finally {
            await watcher.stop();
            await client.del('other__:separator:1', 'separator:2');
        }
    });

    it('should open one subscriber when start is called concurrently', async () => {
        const named = createClient({
            url: process.env.REDIS_CONNECTION_STRING,
            options: { connectionName: 'watcher-concurrent-start' },
        });
        const countConnections = async () => (await named.client('LIST') as string)
            .split('\n')
            .filter((line) => line.includes(' name=watcher-concurrent-start ')).length;

        try {
            await named.ping();

            const watcher = new Watcher(named);

            await Promise.all([watcher.start(), watcher.start()]);
            expect(await countConnections()).toEqual(2);

            await watcher.stop();
            await new Promise((resolve) => {
                setTimeout(resolve, 100);
            });
            expect(await countConnections()).toEqual(1);
        } finally {
            named.disconnect();
        }
    });

    it('should track the subscriber of a restart that overlaps a stop', async () => {
        const named = createClient({
            url: process.env.REDIS_CONNECTION_STRING,
            options: { connectionName: 'watcher-restart' },
        });
        const countConnections = async () => (await named.client('LIST') as string)
            .split('\n')
            .filter((line) => line.includes(' name=watcher-restart ')).length;

        try {
            await named.ping();

            const watcher = new Watcher(named, { pattern: 'restart:*' });
            const keys: string[] = [];

            watcher.on('set', (key) => keys.push(key));

            const first = watcher.start();
            const stopping = watcher.stop();
            const second = watcher.start();

            await Promise.all([first, stopping, second]);
            await new Promise((resolve) => {
                setTimeout(resolve, 100);
            });
            expect(await countConnections()).toEqual(2);

            await named.set('restart:1', 'x');
            await new Promise((resolve) => {
                setTimeout(resolve, 100);
            });
            expect(keys).toEqual(['restart:1']);

            await watcher.stop();
            await watcher.stop();
            await new Promise((resolve) => {
                setTimeout(resolve, 100);
            });
            expect(await countConnections()).toEqual(1);
        } finally {
            await named.del('restart:1');
            named.disconnect();
        }
    });
});
