/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    EntityTrackerContext,
    EntityTrackerItem,
    EntityTrackerOptions,
} from './type';
import { extendEntityTrackerDefaultOptions } from './utils';
import { RedisKeyContext, RedisKeyEntityID } from '../type';
import { buildRedisKey } from '../utils';

export class EntityTracker<
    K extends RedisKeyContext,
    ID extends RedisKeyEntityID,
> {
    protected context: EntityTrackerContext;

    protected options: EntityTrackerOptions;

    constructor(context: EntityTrackerContext, options: EntityTrackerOptions) {
        this.context = context;
        this.options = extendEntityTrackerDefaultOptions(options);
    }

    //--------------------------------------------------------------------

    async getTotal(key?: K) : Promise<number | undefined> {
        return this.context.redisDatabase.zcard(this.buildRedisKey({ context: key }));
    }

    async getMany(key?: K, limit?: number, offset?: number) {
        let data : string[] = [];

        if (typeof limit === 'undefined') {
            data = await this.context.redisDatabase.zrevrangebyscore(
                this.buildRedisKey({ context: key }),
                '+inf',
                '-inf',
                'WITHSCORES',
            );
        } else {
            offset ??= 0;

            data = await this.context.redisDatabase.zrevrangebyscore(
                this.buildRedisKey({ context: key }),
                '+inf',
                '-inf',
                'WITHSCORES',
                'LIMIT',
                offset,
                limit,
            );
        }

        const items : EntityTrackerItem<ID>[] = [];

        for (let i = 0; i < data.length; i += 2) {
            items.push({
                id: data[i] as unknown as ID,
                score: parseInt(data[i + 1], 10),
            });
        }

        return {
            data: items,
            meta: {
                ...(limit ? { limit } : {}),
                ...(offset ? { offset } : {}),
            },
        };
    }

    //--------------------------------------------------------------------

    async add(id: ID, key?: K, meta?: Record<string, any>) {
        await this.context.redisDatabase.zadd(
            this.buildRedisKey({ context: key }),
            (Date.now() / 1000).toFixed(),
            id,
        );

        if (meta) {
            await this.setMeta(id, meta, key);
        }
    }

    async drop(id: ID, key?: K) {
        await this.context.redisDatabase.zrem(
            this.buildRedisKey({ context: key }),
            id,
        );

        await this.dropMeta(id, key);
    }

    //--------------------------------------------------------------------

    public async setMeta(id: ID, meta: Record<string, any>, key?: K) {
        const keys = Object.keys(meta);

        for (let i = 0; i < keys.length; i++) {
            await this.context.redisDatabase.hset(this.buildRedisKeyMeta(id, key), keys[i], meta[keys[i]]);
        }
    }

    public async setMetaProperty(
        id: ID,
        metaKey: string,
        metaValue: any,
        key?: K,
    ) {
        await this.context.redisDatabase.hset(this.buildRedisKeyMeta(id, key), metaKey, metaValue);
    }

    public async dropMeta(id: ID, key?: K) {
        await this.context.redisDatabase.del(this.buildRedisKeyMeta(id, key));
    }

    //--------------------------------------------------------------------

    buildRedisKey(params: {id?: ID, context?: K}) {
        const keyPath = buildRedisKey(params, this.options);
        return keyPath.length > 0 ? `cache.${keyPath}` : 'tracker';
    }

    buildRedisKeyMeta(id: ID, key?: K) {
        return `${this.buildRedisKey({ id, context: key })}.meta`;
    }
}
