/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    EntityTrackerContext,
    EntityTrackerIDType,
    EntityTrackerItem,
    EntityTrackerKeyType,
    EntityTrackerOptions,
} from './type';
import { extendDefaultOptions } from './utils';

export class EntityTracker<
    K extends EntityTrackerKeyType,
    ID extends EntityTrackerIDType,
> {
    protected context: EntityTrackerContext;

    protected options: EntityTrackerOptions<K>;

    constructor(context: EntityTrackerContext, options: EntityTrackerOptions<K>) {
        this.context = context;
        this.options = extendDefaultOptions(options);
    }

    //--------------------------------------------------------------------

    async getTotal(key?: K) : Promise<number | undefined> {
        return this.context.redisDatabase.zcard(this.options.buildKey(key));
    }

    async getMany(key?: K, limit?: number, offset?: number) {
        let data : string[] = [];

        if (typeof limit === 'undefined') {
            data = await this.context.redisDatabase.zrevrangebyscore(
                this.options.buildKey(key),
                '+inf',
                '-inf',
                'WITHSCORES',
            );
        } else {
            offset ??= 0;

            data = await this.context.redisDatabase.zrevrangebyscore(
                this.options.buildKey(key),
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
            this.options.buildKey(key),
            (Date.now() / 1000).toFixed(),
            id,
        );
    }

    async drop(id: ID, key?: K) {
        await this.context.redisDatabase.zrem(
            this.options.buildKey(key),
            id,
        );
    }

    //--------------------------------------------------------------------

    public async setMeta(id: ID, meta: Record<string, any>, key?: K) {
        const keys = Object.keys(meta);

        for (let i = 0; i < keys.length; i++) {
            await this.context.redisDatabase.hset(this.buildMetaPath(id, key), keys[i], meta[keys[i]]);
        }
    }

    public async setMetaProperty(
        id: ID,
        metaKey: string,
        metaValue: any,
        key?: K,
    ) {
        await this.context.redisDatabase.hset(this.buildMetaPath(id, key), metaKey, metaValue);
    }

    public async dropMeta(id: ID, key?: K) {
        await this.context.redisDatabase.del(this.buildMetaPath(id, key));
    }

    //--------------------------------------------------------------------

    buildMetaPath(id: ID, key?: K) {
        return `${this.options.buildKey(key)}:${id}`;
    }
}
