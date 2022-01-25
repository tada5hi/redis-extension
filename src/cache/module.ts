/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from 'events';
import { CacheContext, CacheOptions } from './type';
import {
    KeyOptions, KeyPathID, KeyPathParseResult, KeyReference,
} from '../type';
import { CacheScheduler } from './sheduler';
import { buildKeyPath } from '../utils';

export declare interface Cache<
    K extends string | number = string | number,
    O extends KeyReference = never,
    > {
    on(event: 'expired', listener: (key: KeyPathParseResult<K, O>) => void): this;
    on(event: 'started', listener: () => void): this;
    on(event: 'stopped', listener: () => void): this;
    on(event: string, listener: CallableFunction): this;
}

export class Cache<
    K extends string | number = string | number,
    O extends KeyReference = never,
> extends EventEmitter {
    protected scheduler : CacheScheduler<K, O> | undefined;

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
    async startScheduler() : Promise<void> {
        if (typeof this.scheduler !== 'undefined') {
            return;
        }

        const scheduler = new CacheScheduler<K, O>({
            redis: this.context.redis,
        }, this.buildOptions());

        await scheduler.start();

        scheduler.on('expired', (data) => {
            this.emit('expired', data);
        });

        this.scheduler = scheduler;

        this.emit('started');
    }

    /* istanbul ignore next */
    async stopScheduler() : Promise<void> {
        if (!this.scheduler) return;

        await this.scheduler.stop();
        this.scheduler = undefined;

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

    buildOptions(options?: KeyOptions<K, O>) : CacheOptions<K, O> {
        options ??= {};

        return {
            ...this.options,
            ...options,
            prefix: this.options.prefix || 'cache',
        } as CacheOptions<K, O>;
    }
}
