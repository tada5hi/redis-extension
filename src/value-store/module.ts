/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Cluster } from '../driver';
import type { ValueStoreOptions, ValueStoreSetOptions } from './types';

/**
 * SET the value (ARGV[2]) with the SET arguments (ARGV[3..]), only while the
 * key still holds the unreadable value (ARGV[1]).
 */
const REPLACE_SCRIPT = `if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('SET', KEYS[1], ARGV[2], unpack(ARGV, 3))
end
return false`;

export class ValueStore<T = any> {
    protected client : Client | Cluster;

    protected serializer : (value: T) => string | Promise<string>;

    protected deserializer : (text: string) => T | Promise<T>;

    constructor(client: Client | Cluster, options: ValueStoreOptions<T> = {}) {
        this.client = client;
        this.serializer = options.serialize || JSON.stringify;
        this.deserializer = options.deserialize || JSON.parse;
    }

    /**
     * Write the serialized value.
     *
     * @returns true when the value was written, false when ifExists or ifNotExists skipped the write.
     */
    async set(key: string, value: T, options: ValueStoreSetOptions = {}) : Promise<boolean> {
        const data = await this.serialize(key, value);

        return await this.client.call('SET', key, data, ...this.setArguments(options)) === 'OK';
    }

    /**
     * Read a value.
     *
     * @returns the value, or undefined when the key does not exist, its value
     * cannot be read: deserialize throws or rejects for it.
     */
    async get(key: string) : Promise<undefined | T> {
        return this.read(await this.client.get(key));
    }

    /**
     * Read several values with one GET per key, sent together. Unlike MGET,
     * GET rejects a key of another type, as get() does, and works on a
     * cluster, whose keys can live on different nodes.
     *
     * @returns the values in the order of the keys, undefined where get() would resolve undefined.
     */
    async getMany(keys: string[]) : Promise<(T | undefined)[]> {
        if (keys.length === 0) {
            return [];
        }

        const entries = await Promise.all(keys.map((key) => this.client.get(key)));

        return Promise.all(entries.map((entry) => this.read(entry)));
    }

    /**
     * Write several values concurrently, each with the same options. The
     * writes are not atomic.
     *
     * @returns one set() result per entry, in order.
     */
    async setMany(
        entries: Record<string, T> | [string, T][],
        options: ValueStoreSetOptions = {},
    ) : Promise<boolean[]> {
        const list = Array.isArray(entries) ? entries : Object.entries(entries);

        return Promise.all(list.map(([key, value]) => this.set(key, value, options)));
    }

    /**
     * Read a value, or compute, store and return it when it is missing.
     * Concurrent callers can each run the factory; with ifNotExists, the
     * first write wins and every caller resolves the stored value.
     */
    async getOrSet(
        key: string,
        factory: () => T | Promise<T>,
        options: ValueStoreSetOptions = {},
    ) : Promise<T> {
        const current = await this.get(key);

        if (typeof current !== 'undefined') {
            return current;
        }

        const value = await factory();
        const data = await this.serialize(key, value);

        if (await this.client.call('SET', key, data, ...this.setArguments(options)) === 'OK') {
            return value;
        }

        // ifExists or ifNotExists skipped the write: resolve what is stored
        const entry = await this.client.get(key);
        const stored = await this.read(entry);

        if (typeof stored !== 'undefined') {
            return stored;
        }

        if (entry !== null && options.ifNotExists) {
            // an unreadable value blocks NX forever; replace it, unless a
            // concurrent caller replaced it first
            const replaced = await this.client.eval(
                REPLACE_SCRIPT,
                1,
                key,
                entry,
                data,
                ...this.setArguments({ ...options, ifNotExists: false }),
            );

            if (replaced !== 'OK') {
                const latest = await this.get(key);

                if (typeof latest !== 'undefined') {
                    return latest;
                }
            }
        }

        return value;
    }

    async drop(key: string) : Promise<boolean> {
        return await this.client.del(key) === 1;
    }

    protected async serialize(key: string, value: T) : Promise<string> {
        // JSON.stringify returns undefined for undefined, functions and symbols
        const data : unknown = await this.serializer(value);

        if (typeof data !== 'string') {
            throw new TypeError(`The value for the key ${key} cannot be serialized.`);
        }

        return data;
    }

    /**
     * The SET arguments after key and value.
     */
    protected setArguments(options: ValueStoreSetOptions) : (string | number)[] {
        const output : (string | number)[] = [];

        let milliseconds : number | undefined;

        if (options.milliseconds) {
            milliseconds = options.milliseconds;
        } else if (options.seconds) {
            milliseconds = options.seconds * 1000;
        }

        if (options.keepTTL) {
            output.push('KEEPTTL');
        } else if (milliseconds) {
            // PX takes a positive integer
            output.push('PX', Math.max(1, Math.round(milliseconds)));
        }

        if (options.ifExists) {
            output.push('XX');
        } else if (options.ifNotExists) {
            output.push('NX');
        }

        return output;
    }

    protected async read(entry: string | null) : Promise<T | undefined> {
        if (entry === null) {
            return undefined;
        }

        try {
            return await this.deserializer(entry);
        } catch {
            return undefined;
        }
    }
}
