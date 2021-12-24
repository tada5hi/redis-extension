/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import IORedis, { Redis } from 'ioredis';
import { RedisConfig, getRedisConfig } from '../config';

const instanceMap: Record<string, Redis> = {};

export function useRedisInstance(alias = 'default') : Redis {
    const config = getRedisConfig(alias);

    if (Object.prototype.hasOwnProperty.call(instanceMap, alias)) {
        return instanceMap[alias];
    }

    instanceMap[alias] = createRedisInstance(config);

    return instanceMap[alias];
}

export function createRedisInstance(config: RedisConfig) : Redis {
    return new IORedis(
        config.connectionString,
        config.options,
    );
}
