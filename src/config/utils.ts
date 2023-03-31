/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Config, ConfigInput } from './type';

export function buildConfigWithDefaults(
    input?: ConfigInput,
) {
    input = input || {};
    input.options = {
        enableReadyCheck: true,
        retryStrategy(times: number): number | void | null {
            /* istanbul ignore next */
            return times === 3 ? null : Math.min(times * 50, 2000);
        },
        reconnectOnError(error: Error): boolean {
            /* istanbul ignore next */
            return error.message.includes('ECONNRESET');
        },
    };

    return buildConfig(input);
}

export function buildConfig(input?: ConfigInput) : Config {
    input = input || {};

    return {
        ...input,
        clusterNodes: input.clusterNodes || [],
        clusterOptions: input.clusterOptions || {},
        options: input.options || {},
    };
}
