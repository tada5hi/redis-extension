/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from 'node:events';
import type { Redis } from 'ioredis';
import type { WatcherOptions, WatcherSetOptions } from './types';
import type { Key } from '../key';
import { parseKey, stringifyKey } from '../key';

export class Watcher extends EventEmitter {
    protected client: Redis;

    protected subscriberClient : Redis | undefined;

    protected options : WatcherOptions;

    //--------------------------------------------------------------------

    constructor(
        client: Redis,
        options: WatcherOptions = {},
    ) {
        super();

        this.client = client;
        this.options = options;
    }

    //--------------------------------------------------------------------

    override on(event: 'expired', listener: (key: Key) => void) : this;

    override on(event: 'started', listener: () => void) : this;

    override on(event: 'stopped', listener: () => void) : this;

    override on(event: 'failed', listener: (message: string, meta: unknown) => string) : this;

    override on(event: string, listener: (...args: any[]) => void) : this {
        return super.on(event, listener);
    }

    /* istanbul ignore next */
    async start() : Promise<void> {
        if (this.subscriberClient) {
            return;
        }

        const subscriber = this.client.duplicate();

        await subscriber.config('SET', 'notify-keyspace-events', 'Ex');
        await subscriber.psubscribe('__key*__:*');

        const handleResult = (input: unknown) => {
            if (typeof input !== 'string' || input.length === 0) {
                this.emit('failed', 'Expired key could not be parsed.', input);
                return;
            }

            const result = parseKey(input);

            if (
                this.options &&
                this.options.prefix &&
                this.options.prefix !== result.prefix
            ) {
                return;
            }

            this.emit('expired', result);
        };

        subscriber.on('pmessage', (_pattern, _channel, message) => {
            handleResult(message);
        });

        this.subscriberClient = subscriber;
        this.emit('started');
    }

    /* istanbul ignore next */
    async stop() : Promise<void> {
        if (!this.subscriberClient) return;

        await this.subscriberClient.punsubscribe('__key*__:*');
        this.subscriberClient.disconnect();
        this.subscriberClient = undefined;

        this.emit('stopped');
    }

    //--------------------------------------------------------------------

    async isExpired(id: string) : Promise<boolean> {
        const idPath = this.extendKey(id);

        const ttl = await this.client.ttl(idPath);

        return ttl <= 0;
    }

    async set(key: string, value: any, options: WatcherSetOptions = {}) {
        const id = this.extendKey(key);

        let milliseconds : number;
        if (options.milliseconds) {
            milliseconds = options.milliseconds;
        } else if (options.seconds) {
            milliseconds = options.seconds * 1000;
        } else if (this.options.milliseconds) {
            milliseconds = this.options.milliseconds;
        } else if (this.options.seconds) {
            milliseconds = this.options.seconds * 1000;
        } else {
            milliseconds = 300 * 1000;
        }

        /* istanbul ignore next */
        if (options.keepTTL) {
            if (options.ifExists) {
                await this.client.set(id, JSON.stringify(value), 'KEEPTTL', 'XX');
            } else if (options.ifNotExists) {
                await this.client.set(id, JSON.stringify(value), 'KEEPTTL', 'NX');
            } else {
                await this.client.set(id, JSON.stringify(value), 'KEEPTTL');
            }

            return;
        }

        if (options.ifExists) {
            await this.client.set(id, JSON.stringify(value), 'PX', milliseconds, 'XX');
        } else if (options.ifNotExists) {
            await this.client.set(id, JSON.stringify(value), 'PX', milliseconds, 'NX');
        } else {
            await this.client.set(id, JSON.stringify(value), 'PX', milliseconds);
        }
    }

    async get<T = any>(id: string) : Promise<undefined | T> {
        const idPath = this.extendKey(id);

        try {
            const entry = await this.client.get(idPath);
            if (entry === null || typeof entry === 'undefined') {
                return undefined;
            }

            return JSON.parse(entry) as T;
        } catch (e) {
            /* istanbul ignore next */
            return undefined;
        }
    }

    async drop(id: string) : Promise<boolean> {
        const idPath = this.extendKey(id);

        return await this.client.del(idPath) === 1;
    }

    //--------------------------------------------------------------------

    protected extendKey(id: string) {
        if (this.options.prefix) {
            return stringifyKey({
                prefix: this.options.prefix,
                id,
            });
        }

        return id;
    }
}
