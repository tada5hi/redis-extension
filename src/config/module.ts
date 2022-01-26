/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { mergeDeep } from '../utils';
import { Config } from './type';

const configMap: Map<string, Config> = new Map<string, Config>();

export function setConfig(
    value: Config,
    key?: string,
) {
    key = key || 'default';

    configMap.set(key, value);
}

export function useConfig(
    key?: string,
): Config {
    key = key || 'default';

    const data: Config | undefined = configMap.get(key);
    if (typeof data === 'undefined') {
        return buildConfig();
    }

    return buildConfig(data);
}

export function buildConfig(config?: Config) : Config {
    config ??= {};

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
