/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    TrackerContext,
    TrackerItem,
    TrackerOptions,
} from './type';
import { KeyOptions, KeyPathID, KeyReference } from '../type';
import { buildKeyPath } from '../utils';

export class Tracker<
    K extends string | number = string | number,
    O extends KeyReference = never,
> {
    protected context: TrackerContext;

    protected options: TrackerOptions<K, O>;

    constructor(context: TrackerContext, options?: TrackerOptions<K, O>) {
        options ??= {};

        this.context = context;
        this.options = options;
    }

    //--------------------------------------------------------------------

    async getTotal(context?: O) : Promise<number | undefined> {
        return this.context.redis.zcard(this.buildKey({ context }));
    }

    async getMany(options?: {context?: O, limit?: number, offset?: number, sort?: 'ASC' | 'DESC'}) {
        options ??= {};
        options.sort = options.sort || 'DESC';

        let data : string[];

        if (typeof options.limit === 'undefined') {
            if (options.sort === 'DESC') {
                data = await this.context.redis.zrevrangebyscore(
                    this.buildKey({ context: options.context }),
                    '+inf',
                    '-inf',
                    'WITHSCORES',
                );
            } else {
                data = await this.context.redis.zrangebyscore(
                    this.buildKey({ context: options.context }),
                    '-inf',
                    '+inf',
                    'WITHSCORES',
                );
            }
        } else {
            options.offset ??= 0;
            if (options.sort === 'DESC') {
                data = await this.context.redis.zrevrangebyscore(
                    this.buildKey({ context: options.context }),
                    '+inf',
                    '-inf',
                    'WITHSCORES',
                    'LIMIT',
                    options.offset,
                    options.limit,
                );
            } else {
                data = await this.context.redis.zrangebyscore(
                    this.buildKey({ context: options.context }),
                    '-inf',
                    '+inf',
                    'WITHSCORES',
                    'LIMIT',
                    options.offset,
                    options.limit,
                );
            }
        }

        const items : TrackerItem<KeyPathID<K, O>>[] = [];

        for (let i = 0; i < data.length; i += 2) {
            items.push({
                id: data[i] as unknown as KeyPathID<K, O>, // todo: maybe str -> number
                score: parseInt(data[i + 1], 10),
            });
        }

        return {
            data: items,
            meta: {
                ...(options.limit ? { limit: options.limit } : {}),
                ...(options.offset ? { offset: options.offset } : {}),
            },
        };
    }

    //--------------------------------------------------------------------

    async add(id: KeyPathID<K, O>, options?: {context?: O, meta?: Record<string, any>}) {
        options ??= {};

        await this.context.redis.zadd(
            this.buildKey({ context: options.context }),
            parseInt(Date.now().toFixed(), 10),
            `${id}`,
        );

        if (options.meta) {
            await this.setMeta(id, options.meta, options.context);
        }
    }

    async drop(id: KeyPathID<K, O>, context?: O) {
        await this.context.redis.zrem(
            this.buildKey({ context }),
            `${id}`,
        );

        await this.dropMeta(id, context);
    }

    //--------------------------------------------------------------------

    public async setMeta(id: KeyPathID<K, O>, meta: Record<string, any>, context?: O) {
        await this.context.redis.hset(
            this.buildMetaKey(context),
            `${id}`,
            JSON.stringify(meta),
        );
    }

    public async getMeta(id: KeyPathID<K, O>, context?: O) : Promise<Record<string, any> | undefined> {
        const data = await this.context.redis.hget(
            this.buildMetaKey(context),
            `${id}`,
        );

        if (data === null || typeof data === 'undefined') {
            return undefined;
        }

        return JSON.parse(data);
    }

    public async dropMeta(id: KeyPathID<K, O>, context?: O) {
        await this.context.redis.hdel(this.buildMetaKey(context), `${id}`);
    }

    //--------------------------------------------------------------------

    buildKey(options: KeyOptions<K, O>) {
        return buildKeyPath({
            ...this.options,
            ...options,
            prefix: this.options.prefix || 'tracker',
        });
    }

    buildMetaKey(context?: O) {
        return `${this.buildKey({ context })}.meta`;
    }
}
