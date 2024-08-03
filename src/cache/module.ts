/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from 'events';
import type { Redis } from 'ioredis';
import type { CacheOptionsInput, CacheSetOptions } from './types';
import type { Key } from '../key';
import { parseKey, stringifyKey } from '../key';

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export declare interface Cache {
    on(event: 'expired', listener: (key: Key) => void): this;
    on(event: 'started', listener: () => void): this;
    on(event: 'stopped', listener: () => void): this;
    on(event: 'failed', listener: (message: string, meta: unknown) => string) : this;
    on(event: string, listener: CallableFunction): this;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class Cache extends EventEmitter implements Cache {
    protected client: Redis;

    protected subscriberClient : Redis | undefined;

    protected options : CacheOptionsInput;

    //--------------------------------------------------------------------

    constructor(
        client: Redis,
        options: CacheOptionsInput = {},
    ) {
        super();

        this.client = client;
        this.options = options;
    }

    //--------------------------------------------------------------------

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

    async set(key: string, value: any, options: CacheSetOptions = {}) {
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

    async get(id: string) : Promise<undefined | any> {
        const idPath = this.extendKey(id);

        try {
            const entry = await this.client.get(idPath);
            if (entry === null || typeof entry === 'undefined') {
                return undefined;
            }

            return JSON.parse(entry);
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
        return stringifyKey({
            prefix: this.options.prefix || 'cache',
            id,
        });
    }
}
