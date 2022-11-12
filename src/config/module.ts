/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { merge } from 'smob';
import { Config } from './type';

const getAlias = (alias?: string) => alias || 'default';

const instances : Record<string, Config> = {};

export function setConfig(
    value: Config,
    alias?: string,
) {
    alias = getAlias(alias);

    instances[alias] = value;
}

export function hasConfig(alias?: string) {
    alias = getAlias(alias);

    return Object.prototype.hasOwnProperty.call(instances, alias);
}

export function useConfig(
    alias?: string,
): Config {
    alias = getAlias(alias);

    return buildConfig(instances[alias] || {});
}

export function buildConfig(config?: Config) : Config {
    config ??= {};

    return merge({
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
