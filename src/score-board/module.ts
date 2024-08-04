/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../driver';
import type {
    ScoreBoardGetOptions, ScoreBoardGetOutput,
    ScoreBoardItem,
    ScoreBoardOptions, ScoreBoardOptionsInput,
} from './types';

export class ScoreBoard {
    protected client: Client;

    protected options: ScoreBoardOptions;

    constructor(client: Client, options: ScoreBoardOptionsInput = {}) {
        this.client = client;
        this.options = {
            ...options,
            key: 'score-board',
        };
    }

    //--------------------------------------------------------------------

    async get(options: ScoreBoardGetOptions = {}) : Promise<ScoreBoardGetOutput> {
        options.sort = options.sort || 'DESC';

        let data : string[];

        if (typeof options.limit === 'undefined') {
            if (options.sort === 'DESC') {
                data = await this.client.zrevrangebyscore(
                    this.options.key,
                    '+inf',
                    '-inf',
                    'WITHSCORES',
                );
            } else {
                data = await this.client.zrangebyscore(
                    this.options.key,
                    '-inf',
                    '+inf',
                    'WITHSCORES',
                );
            }
        } else {
            options.offset ??= 0;
            if (options.sort === 'DESC') {
                data = await this.client.zrevrangebyscore(
                    this.options.key,
                    '+inf',
                    '-inf',
                    'WITHSCORES',
                    'LIMIT',
                    options.offset,
                    options.limit,
                );
            } else {
                data = await this.client.zrangebyscore(
                    this.options.key,
                    '-inf',
                    '+inf',
                    'WITHSCORES',
                    'LIMIT',
                    options.offset,
                    options.limit,
                );
            }
        }

        const items : ScoreBoardItem[] = [];

        for (let i = 0; i < data.length; i += 2) {
            items.push({
                id: data[i],
                score: parseInt(data[i + 1], 10),
            });
        }

        const total = await this.client.zcard(this.options.key);

        return {
            data: items,
            meta: {
                total: total || 0,
                ...(options.limit ? { limit: options.limit } : {}),
                ...(options.offset ? { offset: options.offset } : {}),
            },
        };
    }

    async clear() {
        this.client.del(this.options.key);
    }

    //--------------------------------------------------------------------

    /**
     * Set the score for a given key.
     * THe score will be set on default to performance.now()
     *
     * @param id
     * @param score
     */
    async add(id: string, score?: number) {
        await this.client.zadd(
            this.options.key,
            score || performance.now(),
            `${id}`,
        );
    }

    /**
     * Clear the score for a given key.
     *
     * @param id
     */
    async drop(id: string) {
        await this.client.zrem(
            this.options.key,
            `${id}`,
        );
    }
}
