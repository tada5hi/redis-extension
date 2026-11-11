/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Cluster } from '../driver';
import type {
    ScoreBoardGetOptions,
    ScoreBoardGetOutput,
    ScoreBoardItem,
    ScoreBoardOptions,
    ScoreBoardOptionsInput,
} from './types';

export class ScoreBoard {
    protected client: Client | Cluster;

    protected options: ScoreBoardOptions;

    constructor(client: Client | Cluster, options: ScoreBoardOptionsInput = {}) {
        this.client = client;
        this.options = {
            ...options,
            key: options.key ?? 'score-board',
        };
    }

    //--------------------------------------------------------------------

    async get(options: ScoreBoardGetOptions = {}) : Promise<ScoreBoardGetOutput> {
        const { key } = this.options;
        const offset = options.offset ?? 0;
        // a negative count returns every member from the offset on
        const count = options.limit ?? -1;

        // range and total in one transaction, so total matches the returned page
        const transaction = this.client.multi();

        if ((options.sort || 'DESC') === 'DESC') {
            transaction.zrevrangebyscore(key, '+inf', '-inf', 'WITHSCORES', 'LIMIT', offset, count);
        } else {
            transaction.zrangebyscore(key, '-inf', '+inf', 'WITHSCORES', 'LIMIT', offset, count);
        }

        transaction.zcard(key);

        const [[rangeError, data], [totalError, total]] = await transaction.exec() as [
            [Error | null, string[]],
            [Error | null, number],
        ];

        if (rangeError) {
            throw rangeError;
        }

        if (totalError) {
            throw totalError;
        }

        const items : ScoreBoardItem[] = [];

        for (let i = 0; i < data.length; i += 2) {
            items.push({
                id: data[i]!,
                score: Number(data[i + 1]),
            });
        }

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
        await this.client.del(this.options.key);
    }

    //--------------------------------------------------------------------

    /**
     * Set the score for a given key.
     * The score defaults to the current unix timestamp in milliseconds.
     *
     * @param id
     * @param score
     */
    async add(id: string, score?: number) {
        await this.client.zadd(
            this.options.key,
            score ?? Date.now(),
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

    /**
     * Remove every member whose score is lower than the given score.
     *
     * @param below exclusive upper bound, e.g. Date.now() - 60_000
     * @returns the number of removed members
     */
    async prune(below: number) : Promise<number> {
        return this.client.zremrangebyscore(this.options.key, '-inf', `(${below}`);
    }

    /**
     * Read the score of a member.
     *
     * @returns the score, or undefined for an unknown member
     */
    async score(id: string) : Promise<number | undefined> {
        const score = await this.client.zscore(this.options.key, id);

        return score === null ? undefined : Number(score);
    }

    /**
     * Read the zero-based position of a member.
     *
     * @param id
     * @param sort 'DESC' (default) counts from the highest score, 'ASC' from the lowest
     * @returns the position, or undefined for an unknown member
     */
    async rank(id: string, sort: 'ASC' | 'DESC' = 'DESC') : Promise<number | undefined> {
        const rank = sort === 'DESC' ?
            await this.client.zrevrank(this.options.key, id) :
            await this.client.zrank(this.options.key, id);

        return rank === null ? undefined : rank;
    }

    /**
     * Add to the score of a member; an unknown member starts at 0.
     *
     * @returns the new score
     */
    async increment(id: string, by = 1) : Promise<number> {
        return Number(await this.client.zincrby(this.options.key, by, id));
    }
}
