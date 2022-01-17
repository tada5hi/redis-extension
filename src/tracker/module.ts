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
import { extendRedisTrackerDefaultOptions } from './utils';
import { EntityID, KeyContext } from '../type';
import { buildKey } from '../utils';

export class Tracker<
    ID extends EntityID,
    K extends KeyContext = never,
> {
    protected context: TrackerContext;

    protected options: TrackerOptions;

    constructor(context: TrackerContext, options?: TrackerOptions) {
        options ??= {};

        this.context = context;
        this.options = extendRedisTrackerDefaultOptions(options);
    }

    //--------------------------------------------------------------------

    async getTotal(context?: K) : Promise<number | undefined> {
        return this.context.redis.zcard(this.buildKey({ context }));
    }

    async getMany(options?: {context?: K, limit?: number, offset?: number, sort?: 'ASC' | 'DESC'}) {
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

        const items : TrackerItem<ID>[] = [];

        for (let i = 0; i < data.length; i += 2) {
            items.push({
                id: data[i] as unknown as ID,
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

    async add(id: ID, options?: {context?: K, meta?: Record<string, any>}) {
        options ??= {};

        await this.context.redis.zadd(
            this.buildKey({ context: options.context }),
            parseInt(Date.now().toFixed(), 10),
            id,
        );

        if (options.meta) {
            await this.setMeta(id, options.meta, options.context);
        }
    }

    async drop(id: ID, key?: K) {
        await this.context.redis.zrem(
            this.buildKey({ context: key }),
            id,
        );

        await this.dropMeta(id, key);
    }

    //--------------------------------------------------------------------

    public async setMeta(id: ID, meta: Record<string, any>, context?: K) {
        await this.context.redis.hset(
            this.buildMetaKey(context),
            id,
            JSON.stringify(meta),
        );
    }

    public async getMeta(id: ID, context?: K) : Promise<Record<string, any> | undefined> {
        const data = await this.context.redis.hget(
            this.buildMetaKey(context),
            `${id}`,
        );

        if (data === null || typeof data === 'undefined') {
            return undefined;
        }

        return JSON.parse(data);
    }

    public async dropMeta(id: ID, context?: K) {
        await this.context.redis.hdel(this.buildMetaKey(context), `${id}`);
    }

    //--------------------------------------------------------------------

    buildKey(params: {id?: ID, context?: K}) {
        return buildKey(params, {
            ...this.options,
            prefix: `tracker${this.options.prefix ? `.${this.options.prefix}` : ''}`,
        });
    }

    buildMetaKey(context?: K) {
        return `${this.buildKey({ context })}.meta`;
    }
}
