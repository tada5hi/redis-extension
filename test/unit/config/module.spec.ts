/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {getRedisConfig, setRedisConfig} from "../../../src";

describe('src/config', () => {
    it('should set & get redis config', () => {
        setRedisConfig('default', {
            connectionString: 'foo'
        });

        let redisConfig = getRedisConfig('default');
        expect(redisConfig).toBeDefined();
        expect(redisConfig.connectionString).toEqual('foo');
        expect(redisConfig.options).toBeDefined();
        expect(redisConfig.options.enableReadyCheck).toEqual(true);
        expect(redisConfig.options.retryStrategy).toBeDefined();
        expect(redisConfig.options.reconnectOnError).toBeDefined();

        redisConfig = getRedisConfig('foo');
        expect(redisConfig).toBeDefined();
        expect(redisConfig.connectionString).toBeUndefined();
        expect(redisConfig.options).toBeDefined();
    });

    it('should set & get redis config with options', () => {
        setRedisConfig('default', {
            options: {
                role: "master"
            }
        });

        let redisConfig = getRedisConfig('default');
        expect(redisConfig).toBeDefined();
        expect(redisConfig.options).toBeDefined();
        expect(redisConfig.options.role).toEqual('master');

        redisConfig = getRedisConfig('foo');
        expect(redisConfig).toBeDefined();
        expect(redisConfig.connectionString).toBeUndefined();
        expect(redisConfig.options).toBeDefined();
        expect(redisConfig.options.role).toBeUndefined();
    });
})
