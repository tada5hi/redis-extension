/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import { parseKeyPath } from '../utils';
import { CacheOptions } from './type';
import { KeyPathParseResult, KeyReference } from '../type';

export type CacheSchedulerContext = {
    redis: Redis,
};

export declare interface CacheScheduler<
    K extends string | number = string | number,
    O extends KeyReference = never,
> {
    on(event: 'expired', listener: (key: KeyPathParseResult<K, O>) => void): this;
    on(event: string, listener: CallableFunction): this;
}

export class CacheScheduler<
    K extends string | number = string | number,
    O extends KeyReference = never,
> extends EventEmitter {
    protected context : CacheSchedulerContext;

    protected options: CacheOptions<K, O>;

    protected subscriber: Redis | undefined;

    constructor(context: CacheSchedulerContext, options: CacheOptions<K, O>) {
        super();

        this.context = context;

        this.options = options;
    }

    async start() : Promise<void> {
        if (this.subscriber) {
            return;
        }

        await this.context.redis.config('SET', 'notify-keyspace-events', 'Ex');

        const subscriber = this.context.redis.duplicate();

        await subscriber.psubscribe(['__key*__:*']);

        const handleResult = (result: KeyPathParseResult<K, O>) => {
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

        subscriber.on('pmessage', (pattern, channel, message) => {
            handleResult(this.parseKey(message));
        });

        this.subscriber = subscriber;
    }

    async stop() {
        if (!this.subscriber) return;

        await this.subscriber.punsubscribe(['__key*__:*']);
        this.subscriber = undefined;
    }

    parseKey(key: string) : KeyPathParseResult<K, O> {
        return parseKeyPath(key);
    }
}
