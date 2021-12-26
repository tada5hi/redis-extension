/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import RealIORedis from "ioredis-mock";
import {RedisCache} from "../../../src";

describe('src/cache/index.ts', function () {
    it('should build cache path', () => {
        const cache = new RedisCache<string>({
            redis: new RealIORedis()
        });

        expect(cache.buildRedisKey({id: 'id'})).toEqual('cache#id');
    });

    it('should create & drop cache', async () => {
        const cache = new RedisCache<string>({
            redis: new RealIORedis()
        });

        await cache.set('id', 'abc');
        let cached = await cache.get('id');
        expect(cached).toEqual('abc');

        let isExpired = await cache.isExpired('id');
        expect(isExpired).toEqual(false);

        await cache.drop('id');

        cached = await cache.get('id');
        expect(cached).toEqual(undefined);

        isExpired = await cache.isExpired('id');
        expect(isExpired).toEqual(true);
    });

    it('should create & drop cache with no value', async () => {
        const cache = new RedisCache<string>({
            redis: new RealIORedis()
        });

        await cache.set('id');
        let cached = await cache.get('id');
        expect(cached).toEqual(true);

        let isExpired = await cache.isExpired('id');
        expect(isExpired).toEqual(false);
    });

    it('should create & drop cache with context', async () => {
        const cache = new RedisCache<string, {realm_id: string}>({
            redis: new RealIORedis()
        });

        const context = {
            realm_id: 'master'
        }

        await cache.set('id', 'abc', {context});
        let cached = await cache.get('id', context);
        expect(cached).toEqual('abc');

        cached = await cache.get('id');
        expect(cached).toEqual(undefined);

        let isExpired = await cache.isExpired('id', context);
        expect(isExpired).toEqual(false);

        isExpired = await cache.isExpired('id');
        expect(isExpired).toEqual(true);

        await cache.drop('id', context);

        cached = await cache.get('id', context);
        expect(cached).toEqual(undefined);

        cached = await cache.get('id');
        expect(cached).toEqual(undefined);

        isExpired = await cache.isExpired('id', context);
        expect(isExpired).toEqual(true);

        isExpired = await cache.isExpired('id');
        expect(isExpired).toEqual(true);
    });
});
