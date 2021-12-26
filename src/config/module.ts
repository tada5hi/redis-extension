/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { mergeDeep } from '../utils';
import { RedisConfig } from './type';

const configMap: Map<string, RedisConfig> = new Map<string, RedisConfig>();

export function setRedisConfig(
    key: string,
    value: RedisConfig,
) {
    configMap.set(key, value);
}

export function getRedisConfig(
    key: string,
): RedisConfig {
    const data: RedisConfig | undefined = configMap.get(key);
    if (typeof data === 'undefined') {
        return extendRedisConfig({});
    }

    return extendRedisConfig(data);
}

export function extendRedisConfig(config: RedisConfig) : RedisConfig {
    return mergeDeep({
        options: {
            enableReadyCheck: true,
            retryStrategy(times: number): number | void | null {
                /* istanbul ignore next */
                return times === 3 ? null : Math.min(times * 50, 2000);
            },
            reconnectOnError(error: Error): boolean {
                /* istanbul ignore next */
                return error.message.includes('ECONNRESET');
            },
        },
    }, config);
}
