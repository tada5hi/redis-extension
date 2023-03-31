/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from 'events';
import type { Redis } from 'ioredis';
import type { CacheContext, CacheOptions } from './type';
import type {
    KeyOptions, KeyPathID, KeyPathParseResult, KeyReference,
} from '../type';
import { buildKeyPath, parseKeyPath } from '../utils';

export declare interface Cache<
    K extends string | number = string | number,
    O extends KeyReference = never,
    > {
    on(event: 'expired', listener: (key: KeyPathParseResult<K, O>) => void): this;
    on(event: 'started', listener: () => void): this;
    on(event: 'stopped', listener: () => void): this;
    on(event: 'failed', listener: (message: string, meta: unknown) => string) : this;
    on(event: string, listener: CallableFunction): this;
}

export class Cache<
    K extends string | number = string | number,
    O extends KeyReference = never,
> extends EventEmitter {
    protected subscriber : Redis | undefined;

    protected context : CacheContext;

    protected options : CacheOptions<K, O>;

    //--------------------------------------------------------------------

    constructor(context: CacheContext, options?: CacheOptions<K, O>) {
        super();

        options ??= {};

        this.context = context;
        this.options = options;
    }

    //--------------------------------------------------------------------

    /* istanbul ignore next */
    async start() : Promise<void> {
        if (this.subscriber) {
            return;
        }

        const subscriber = this.context.redis.duplicate();

        await subscriber.config('SET', 'notify-keyspace-events', 'Ex');
        await subscriber.psubscribe('__key*__:*');

        const handleResult = (input: unknown) => {
            const result = this.parseKey(input);

            if (typeof result === 'undefined') {
                this.emit('failed', 'Expired key could not be parsed.', input);
                return;
            }

            if (
                this.options &&
                this.options.prefix &&
                this.options.prefix !== result.prefix
            ) {
                return;
            }

            if (
                this.options &&
                this.options.suffix &&
                this.options.suffix !== result.suffix
            ) {
                return;
            }

            this.emit('expired', result);
        };

        subscriber.on('pmessage', (_pattern, _channel, message) => {
            handleResult(message);
        });

        this.subscriber = subscriber;
        this.emit('started');
    }

    /* istanbul ignore next */
    async stop() : Promise<void> {
        if (!this.subscriber) return;

        await this.subscriber.punsubscribe('__key*__:*');
        this.subscriber = undefined;

        this.emit('stopped');
    }

    //--------------------------------------------------------------------

    async isExpired(id: KeyPathID<K, O>, context?: O) : Promise<boolean> {
        const idPath = this.buildKey({ id, context });

        const ttl = await this.context.redis.ttl(idPath);

        return ttl <= 0;
    }

    async set(id: KeyPathID<K, O>, value?: any, options?: {seconds?: number, context?: O}) {
        options ??= {};

        const idPath = this.buildKey({ id, context: options.context });
        const seconds = options.seconds ?? this.options.seconds ?? 300;

        if (typeof value === 'undefined') {
            const expireSet: number = await this.context.redis.expire(idPath, seconds);

            if (expireSet === 0) {
                await this.context.redis.set(idPath, 'true', 'EX', seconds);
            }
        } else {
            await this.context.redis.set(idPath, JSON.stringify(value), 'EX', seconds);
        }
    }

    async get(id: KeyPathID<K, O>, context?: O) : Promise<undefined | any> {
        const idPath = this.buildKey({ id, context });

        try {
            const entry = await this.context.redis.get(idPath);
            if (entry === null || typeof entry === 'undefined') {
                return undefined;
            }

            return JSON.parse(entry);
        } catch (e) {
            /* istanbul ignore next */
            return undefined;
        }
    }

    async drop(id: KeyPathID<K, O>, context?: O) : Promise<boolean> {
        const idPath = this.buildKey({ id, context });

        return await this.context.redis.del(idPath) === 1;
    }

    //--------------------------------------------------------------------

    buildKey(options: KeyOptions<K, O>) {
        return buildKeyPath(this.buildOptions(options));
    }

    parseKey(key: unknown) : KeyPathParseResult<K, O> | undefined {
        if (typeof key !== 'string') {
            return undefined;
        }

        return parseKeyPath(key);
    }

    //--------------------------------------------------------------------

    buildOptions(options?: KeyOptions<K, O>) : CacheOptions<K, O> {
        options ??= {};

        return {
            ...this.options,
            ...options,
            prefix: this.options.prefix || 'cache',
        } as CacheOptions<K, O>;
    }
}
