/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { type Client, ScoreBoard, createClient } from '../../../src';

const delay = (ms: number) => new Promise((res) => {
    setTimeout(res, ms);
});

describe('score-board', () => {
    let client: Client;

    beforeAll(async () => {
        client = createClient({
            connectionString: process.env.REDIS_CONNECTION_STRING,
        });
    });

    afterAll(async () => {
        client.disconnect();
    });

    it('should add & count entries', async () => {
        const scoreBoard = new ScoreBoard(client);

        await scoreBoard.add('foo');
        let total = await scoreBoard.getTotal();
        expect(total).toEqual(1);

        await scoreBoard.add('bar');
        total = await scoreBoard.getTotal();
        expect(total).toEqual(2);

        await scoreBoard.clear();
    });

    it('should add and clear entries', async () => {
        const scoreBoard = new ScoreBoard(client);

        await scoreBoard.add('foo');
        let total = await scoreBoard.getTotal();
        expect(total).toEqual(1);

        await scoreBoard.clear();

        total = await scoreBoard.getTotal();
        expect(total).toEqual(0);
    });

    it('should drop & count entries', async () => {
        const scoreBoard = new ScoreBoard(client);

        await scoreBoard.add('foo');
        await scoreBoard.add('bar');
        await scoreBoard.drop('bar');

        const total = await scoreBoard.getTotal();
        expect(total).toEqual(1);

        await scoreBoard.clear();
    });

    it('should get entries', async () => {
        const scoreBoard = new ScoreBoard(client);

        await scoreBoard.add('foo');
        await delay(0);
        await scoreBoard.add('bar');

        let entities = await scoreBoard.getMany({ sort: 'ASC' });
        let ids = entities.data.map((item) => item.id);
        expect(ids).toEqual(['foo', 'bar']);
        expect(entities.meta).toEqual({});

        entities = await scoreBoard.getMany({ sort: 'DESC' });
        ids = entities.data.map((item) => item.id);
        expect(ids).toEqual(['bar', 'foo']);

        entities = await scoreBoard.getMany({ offset: 0, limit: 1, sort: 'ASC' });
        ids = entities.data.map((item) => item.id);
        expect(ids).toEqual(['foo']);

        entities = await scoreBoard.getMany({ offset: 1, limit: 1, sort: 'ASC' });
        ids = entities.data.map((item) => item.id);
        expect(ids).toEqual(['bar']);

        entities = await scoreBoard.getMany({ offset: 0, limit: 1, sort: 'DESC' });
        ids = entities.data.map((item) => item.id);
        expect(ids).toEqual(['bar']);

        entities = await scoreBoard.getMany({ offset: 1, limit: 1, sort: 'DESC' });
        ids = entities.data.map((item) => item.id);
        expect(ids).toEqual(['foo']);
    });
});
