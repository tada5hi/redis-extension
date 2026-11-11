/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Cluster } from '../driver';
import type { JSONAdapterOptions, JSONAdapterSerializer, JSONAdapterSetOptions } from './types';

export class JsonAdapter<T = any> {
    protected client : Client | Cluster;

    protected serializer : JSONAdapterSerializer;

    protected parse : ((value: unknown) => T) | undefined;

    constructor(client: Client | Cluster, options: JSONAdapterOptions<T> = {}) {
        this.client = client;
        this.serializer = options.serializer || JSON;
        this.parse = options.parse;
    }

    /**
     * Write the serialized value.
     *
     * @returns true when the value was written, false when ifExists or ifNotExists skipped the write.
     */
    async set(key: string, value: T, options: JSONAdapterSetOptions = {}) : Promise<boolean> {
        // JSON.stringify returns undefined for undefined, functions and symbols
        const data : unknown = this.serializer.stringify(value);

        if (typeof data !== 'string') {
            throw new TypeError(`The value for the key ${key} cannot be serialized.`);
        }

        let milliseconds : number | undefined;

        if (options.milliseconds) {
            milliseconds = options.milliseconds;
        } else if (options.seconds) {
            milliseconds = options.seconds * 1000;
        }

        if (milliseconds) {
            // PX takes a positive integer
            milliseconds = Math.max(1, Math.round(milliseconds));
        }

        let result : string | null;

        if (options.keepTTL) {
            if (options.ifExists) {
                result = await this.client.set(key, data, 'KEEPTTL', 'XX');
            } else if (options.ifNotExists) {
                result = await this.client.set(key, data, 'KEEPTTL', 'NX');
            } else {
                result = await this.client.set(key, data, 'KEEPTTL');
            }
        } else if (milliseconds) {
            if (options.ifExists) {
                result = await this.client.set(key, data, 'PX', milliseconds, 'XX');
            } else if (options.ifNotExists) {
                result = await this.client.set(key, data, 'PX', milliseconds, 'NX');
            } else {
                result = await this.client.set(key, data, 'PX', milliseconds);
            }
        } else if (options.ifExists) {
            result = await this.client.set(key, data, 'XX');
        } else if (options.ifNotExists) {
            result = await this.client.set(key, data, 'NX');
        } else {
            result = await this.client.set(key, data);
        }

        return result === 'OK';
    }

    /**
     * Read a value.
     *
     * @returns the value, or undefined when the key does not exist, its value
     * cannot be deserialized, or parse rejects it.
     */
    async get(key: string) : Promise<undefined | T> {
        return this.read(await this.client.get(key));
    }

    /**
     * Read several values: one MGET on a client, one GET per key on a
     * cluster, whose keys can live on different nodes.
     *
     * @returns the values in the order of the keys, undefined where get() would resolve undefined.
     */
    async getMany(keys: string[]) : Promise<(T | undefined)[]> {
        if (keys.length === 0) {
            return [];
        }

        // isCluster, not instanceof: the caller's ioredis can be another copy
        const entries = this.client.isCluster ?
            await Promise.all(keys.map((key) => this.client.get(key))) :
            await this.client.mget(keys);

        return entries.map((entry) => this.read(entry));
    }

    /**
     * Write several values concurrently, each with the same options. The
     * writes are not atomic.
     *
     * @returns one set() result per entry, in order.
     */
    async setMany(
        entries: Record<string, T> | [string, T][],
        options: JSONAdapterSetOptions = {},
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
        options: JSONAdapterSetOptions = {},
    ) : Promise<T> {
        const current = await this.get(key);

        if (typeof current !== 'undefined') {
            return current;
        }

        const value = await factory();

        if (!await this.set(key, value, options)) {
            // ifNotExists lost to a concurrent write: resolve what is stored
            const stored = await this.get(key);

            if (typeof stored !== 'undefined') {
                return stored;
            }
        }

        return value;
    }

    async drop(key: string) : Promise<boolean> {
        return await this.client.del(key) === 1;
    }

    protected read(entry: string | null) : T | undefined {
        if (entry === null) {
            return undefined;
        }

        try {
            const value = this.serializer.parse(entry);

            return this.parse ? this.parse(value) : value as T;
        } catch {
            return undefined;
        }
    }
}
