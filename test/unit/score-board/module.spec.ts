import { 
    afterAll, 
    beforeAll, 
    describe, 
    expect, 
    it, 
} from 'vitest';
/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Cluster } from '../../../src';
import { ScoreBoard, createClient } from '../../../src';
import { connections } from '../../utils/connections';

const delay = (ms: number) => new Promise((res) => {
    setTimeout(res, ms);
});

describe.each(connections)('score-board (%s)', (_name, connect) => {
    let client: Client | Cluster;

    beforeAll(async () => {
        client = connect();
    });

    afterAll(async () => {
        client.disconnect();
    });

    it('should add & count entries', async () => {
        const scoreBoard = new ScoreBoard(client);

        await scoreBoard.add('foo');

        let output = await scoreBoard.get();

        expect(output.meta.total).toEqual(1);

        await scoreBoard.add('bar');
        output = await scoreBoard.get();
        expect(output.meta.total).toEqual(2);

        await scoreBoard.clear();
    });

    it('should add and clear entries', async () => {
        const scoreBoard = new ScoreBoard(client);

        await scoreBoard.add('foo');

        let output = await scoreBoard.get();

        expect(output.meta.total).toEqual(1);

        await scoreBoard.clear();

        output = await scoreBoard.get();
        expect(output.meta.total).toEqual(0);
    });

    it('should drop & count entries', async () => {
        const scoreBoard = new ScoreBoard(client);

        await scoreBoard.add('foo');
        await scoreBoard.add('bar');
        await scoreBoard.drop('bar');

        const output = await scoreBoard.get();

        expect(output.meta.total).toEqual(1);

        await scoreBoard.clear();
    });

    it('should get entries', async () => {
        const scoreBoard = new ScoreBoard(client);

        await scoreBoard.add('foo');
        await delay(0);
        await scoreBoard.add('bar');

        let output = await scoreBoard.get({ sort: 'ASC' });
        let ids = output.data.map((item) => item.id);

        expect(ids).toEqual(['foo', 'bar']);
        expect(output.meta).toEqual({ total: 2 });

        output = await scoreBoard.get({ sort: 'DESC' });
        ids = output.data.map((item) => item.id);
        expect(ids).toEqual(['bar', 'foo']);

        output = await scoreBoard.get({
            offset: 0, 
            limit: 1, 
            sort: 'ASC', 
        });
        ids = output.data.map((item) => item.id);
        expect(ids).toEqual(['foo']);

        output = await scoreBoard.get({
            offset: 1, 
            limit: 1, 
            sort: 'ASC', 
        });
        ids = output.data.map((item) => item.id);
        expect(ids).toEqual(['bar']);

        output = await scoreBoard.get({
            offset: 0, 
            limit: 1, 
            sort: 'DESC', 
        });
        ids = output.data.map((item) => item.id);
        expect(ids).toEqual(['bar']);

        output = await scoreBoard.get({
            offset: 1, 
            limit: 1, 
            sort: 'DESC', 
        });
        ids = output.data.map((item) => item.id);
        expect(ids).toEqual(['foo']);
    });

    it('should use the configured key', async () => {
        const scoreBoard = new ScoreBoard(client, { key: 'users-online' });

        await scoreBoard.add('configured');
        expect(await client.zscore('users-online', 'configured')).not.toBeNull();
        expect(await client.zscore('score-board', 'configured')).toBeNull();

        await scoreBoard.clear();
        expect(await client.exists('users-online')).toEqual(0);
    });

    it('should default the score to a unix timestamp in milliseconds', async () => {
        const scoreBoard = new ScoreBoard(client, { key: 'timestamps' });

        const before = Date.now();

        await scoreBoard.add('foo');

        const after = Date.now();

        const { data } = await scoreBoard.get();

        expect(data[0]!.score).toBeGreaterThanOrEqual(before);
        expect(data[0]!.score).toBeLessThanOrEqual(after);

        await scoreBoard.clear();
    });

    it('should keep zero and fractional scores', async () => {
        const scoreBoard = new ScoreBoard(client, { key: 'explicit-scores' });

        await scoreBoard.add('zero', 0);
        await scoreBoard.add('fraction', 1.5);

        const { data } = await scoreBoard.get({ sort: 'ASC' });

        expect(data).toEqual([
            { id: 'zero', score: 0 },
            { id: 'fraction', score: 1.5 },
        ]);

        await scoreBoard.clear();
    });

    it('should keep the default key when key is undefined', async () => {
        const scoreBoard = new ScoreBoard(client, { key: undefined });

        await scoreBoard.add('undefined-key');
        expect(await client.zscore('score-board', 'undefined-key')).not.toBeNull();

        await scoreBoard.drop('undefined-key');
    });

    it('should apply offset without a limit', async () => {
        const scoreBoard = new ScoreBoard(client, { key: 'offset-only' });

        await scoreBoard.add('first', 1);
        await scoreBoard.add('second', 2);
        await scoreBoard.add('third', 3);

        const output = await scoreBoard.get({ sort: 'ASC', offset: 1 });

        expect(output.data.map((item) => item.id)).toEqual(['second', 'third']);
        expect(output.meta).toEqual({ total: 3, offset: 1 });

        await scoreBoard.clear();
    });

    it('should prune members below a score', async () => {
        const scoreBoard = new ScoreBoard(client, { key: 'prune' });

        await scoreBoard.add('stale', 100);
        await scoreBoard.add('edge', 200);
        await scoreBoard.add('fresh', 300);

        expect(await scoreBoard.prune(200)).toEqual(1);

        const { data } = await scoreBoard.get({ sort: 'ASC' });

        expect(data.map((item) => item.id)).toEqual(['edge', 'fresh']);

        await scoreBoard.clear();
    });

    it('should read the score and rank of a member', async () => {
        const scoreBoard = new ScoreBoard(client, { key: 'rank' });

        await scoreBoard.add('low', 1);
        await scoreBoard.add('high', 2.5);

        expect(await scoreBoard.score('high')).toEqual(2.5);
        expect(await scoreBoard.score('missing')).toBeUndefined();

        expect(await scoreBoard.rank('high')).toEqual(0);
        expect(await scoreBoard.rank('low')).toEqual(1);
        expect(await scoreBoard.rank('low', 'ASC')).toEqual(0);
        expect(await scoreBoard.rank('missing')).toBeUndefined();

        await scoreBoard.clear();
    });

    it('should increment the score of a member', async () => {
        const scoreBoard = new ScoreBoard(client, { key: 'increment' });

        expect(await scoreBoard.increment('player')).toEqual(1);
        expect(await scoreBoard.increment('player', 2.5)).toEqual(3.5);
        expect(await scoreBoard.score('player')).toEqual(3.5);

        await scoreBoard.clear();
    });

    it('should keep infinite scores', async () => {
        const scoreBoard = new ScoreBoard(client, { key: 'infinite' });

        await scoreBoard.add('top', Infinity);
        await scoreBoard.add('bottom', -Infinity);

        const { data } = await scoreBoard.get();

        expect(data).toEqual([
            { id: 'top', score: Infinity },
            { id: 'bottom', score: -Infinity },
        ]);
        expect(await scoreBoard.score('top')).toEqual(Infinity);
        expect(await scoreBoard.increment('bottom')).toEqual(-Infinity);

        await scoreBoard.clear();
    });

    it('should include a limit of 0 in meta', async () => {
        const scoreBoard = new ScoreBoard(client, { key: 'limit-zero' });

        await scoreBoard.add('member', 1);

        expect(await scoreBoard.get({ limit: 0 })).toEqual({
            data: [],
            meta: {
                total: 1, 
                limit: 0, 
                offset: 0, 
            }, 
        });

        await scoreBoard.clear();
    });
});

describe('score-board (client options)', () => {
    it('should read pairs with the resp3 reply mapping', async () => {
        const client = createClient({ url: process.env.REDIS_CONNECTION_STRING, options: { replyMapping: 'resp3' } });
        const scoreBoard = new ScoreBoard(client, { key: 'resp3-mapping' });

        try {
            await scoreBoard.add('a', 1);
            await scoreBoard.add('b', 2);

            const { data, meta } = await scoreBoard.get();

            expect(data).toEqual([{ id: 'b', score: 2 }, { id: 'a', score: 1 }]);
            expect(meta.total).toEqual(2);
        } finally {
            await scoreBoard.clear();
            client.disconnect();
        }
    });

    it('should resolve numbers with stringNumbers', async () => {
        const client = createClient({ url: process.env.REDIS_CONNECTION_STRING, options: { stringNumbers: true } });
        const scoreBoard = new ScoreBoard(client, { key: 'string-numbers' });

        try {
            await scoreBoard.add('a', 1);
            await scoreBoard.add('b', 2);

            expect((await scoreBoard.get()).meta.total).toBe(2);
            expect(await scoreBoard.rank('a')).toBe(1);
            expect(await scoreBoard.prune(2)).toBe(1);
        } finally {
            await scoreBoard.clear();
            client.disconnect();
        }
    });

    it('should reject when a WATCH aborts the read', async () => {
        const client = createClient({ url: process.env.REDIS_CONNECTION_STRING });
        const other = createClient({ url: process.env.REDIS_CONNECTION_STRING });
        const scoreBoard = new ScoreBoard(client, { key: 'watched' });

        try {
            await client.watch('watched');
            await other.zadd('watched', 1, 'a');

            await expect(scoreBoard.get()).rejects.toThrow(/aborted/);
        } finally {
            await other.del('watched');
            client.disconnect();
            other.disconnect();
        }
    });
});
