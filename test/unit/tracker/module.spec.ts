/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import RealIORedis from "ioredis-mock";
import {Tracker} from "../../../src";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

describe('src/tracker/index.ts', function () {
    it('should build tracker path', () => {
        const tracker = new Tracker<string>({
            redis: new RealIORedis()
        });

        expect(tracker.buildKey({id: 'id'})).toEqual('tracker#id');
    });

    it('should add & count entries', async () => {
        const tracker = new Tracker<string>({
            redis: new RealIORedis()
        });

        await tracker.add('foo');
        let total = await tracker.getTotal();
        expect(total).toEqual(1);

        await tracker.add('bar');
        total = await tracker.getTotal();
        expect(total).toEqual(2);
    });

    it('should drop & count entries', async () => {
        const tracker = new Tracker<string>({
            redis: new RealIORedis()
        });

        await tracker.add('foo');
        await tracker.add('bar');
        await tracker.drop('bar');

        let total = await tracker.getTotal();
        expect(total).toEqual(1);
    });

    it('should set, get & drop meta', async () => {
        const tracker = new Tracker<string>({
            redis: new RealIORedis()
        });

        await tracker.setMeta('foo', {last_seen: false});
        let payload = await tracker.getMeta('foo');
        expect(payload).toEqual({last_seen: false});

        payload = await tracker.getMeta('bar');
        expect(payload).toBeUndefined();

        await tracker.dropMeta('foo');

        payload = await tracker.getMeta('foo');
        expect(payload).toBeUndefined();

        await tracker.add('foo', {meta: {bar: 'baz'}});
        payload = await tracker.getMeta('foo');
        expect(payload).toEqual({bar: 'baz'});
    })

    it('should get entries', async () => {
        const tracker = new Tracker<string>({
            redis: new RealIORedis()
        });

        await tracker.add('foo');
        await delay(0);
        await tracker.add('bar');

        let entities = await tracker.getMany({sort: 'ASC'});
        let ids = entities.data.map(item => item.id);
        expect(ids).toEqual(['foo', 'bar']);
        expect(entities.meta).toEqual({});

        entities = await tracker.getMany({sort: 'DESC'});
        ids = entities.data.map(item => item.id);
        expect(ids).toEqual(['bar', 'foo']);

        entities = await tracker.getMany({offset: 0, limit: 1, sort: 'ASC'});
        ids = entities.data.map(item => item.id);
        expect(ids).toEqual(['foo']);

        entities = await tracker.getMany({offset: 1, limit: 1, sort: 'ASC'});
        ids = entities.data.map(item => item.id);
        expect(ids).toEqual(['bar']);

        entities = await tracker.getMany({offset: 0, limit: 1, sort: 'DESC'});
        ids = entities.data.map(item => item.id);
        expect(ids).toEqual(['bar']);

        entities = await tracker.getMany({offset: 1, limit: 1, sort: 'DESC'});
        ids = entities.data.map(item => item.id);
        expect(ids).toEqual(['foo']);
    });
});
