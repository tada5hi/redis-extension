/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../driver';
import type {
    TrackerGetManyOptions,
    TrackerItem,
    TrackerOptions,
} from './types';
import { stringifyKey } from '../key';

export class Tracker {
    protected client: Client;

    protected options: TrackerOptions;

    constructor(client: Client, options: TrackerOptions = {}) {
        this.client = client;
        this.options = options;
    }

    //--------------------------------------------------------------------

    async getTotal() : Promise<number | undefined> {
        return this.client.zcard(this.buildKey('score'));
    }

    async getMany(options: TrackerGetManyOptions = {}) {
        options.sort = options.sort || 'DESC';

        let data : string[];

        if (typeof options.limit === 'undefined') {
            if (options.sort === 'DESC') {
                data = await this.client.zrevrangebyscore(
                    this.buildKey('score'),
                    '+inf',
                    '-inf',
                    'WITHSCORES',
                );
            } else {
                data = await this.client.zrangebyscore(
                    this.buildKey('score'),
                    '-inf',
                    '+inf',
                    'WITHSCORES',
                );
            }
        } else {
            options.offset ??= 0;
            if (options.sort === 'DESC') {
                data = await this.client.zrevrangebyscore(
                    this.buildKey('score'),
                    '+inf',
                    '-inf',
                    'WITHSCORES',
                    'LIMIT',
                    options.offset,
                    options.limit,
                );
            } else {
                data = await this.client.zrangebyscore(
                    this.buildKey('score'),
                    '-inf',
                    '+inf',
                    'WITHSCORES',
                    'LIMIT',
                    options.offset,
                    options.limit,
                );
            }
        }

        const items : TrackerItem<string>[] = [];

        for (let i = 0; i < data.length; i += 2) {
            items.push({
                id: data[i], // todo: maybe str -> number
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

    async add(id: string, options: { meta?: Record<string, any> } = {}) {
        await this.client.zadd(
            this.buildKey('score'),
            performance.now(),
            `${id}`,
        );

        if (options.meta) {
            await this.setMeta(id, options.meta);
        }
    }

    async drop(id: string) {
        await this.client.zrem(
            this.buildKey('score'),
            `${id}`,
        );

        await this.dropMeta(id);
    }

    //--------------------------------------------------------------------

    public async setMeta(id: string, meta: Record<string, any>) {
        await this.client.hset(
            this.buildKey('meta'),
            `${id}`,
            JSON.stringify(meta),
        );
    }

    public async getMeta(id: string) : Promise<Record<string, any> | undefined> {
        const data = await this.client.hget(
            this.buildKey('meta'),
            `${id}`,
        );

        if (data === null || typeof data === 'undefined') {
            return undefined;
        }

        return JSON.parse(data);
    }

    public async dropMeta(id: string) {
        await this.client.hdel(this.buildKey('meta'), `${id}`);
    }

    //--------------------------------------------------------------------

    protected buildKey(id: 'meta' | 'score') {
        return stringifyKey({
            ...this.options,
            prefix: this.options.prefix || 'tracker',
            id,
        });
    }
}
