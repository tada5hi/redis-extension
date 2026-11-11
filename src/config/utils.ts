/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Config, ConfigInput } from './types';

export function buildConfigWithDefaults(
    input?: ConfigInput,
) {
    input = input || {};

    return buildConfig({
        ...input,
        options: {
            enableReadyCheck: true,
            retryStrategy(times: number): number {
                return Math.min(times * 50, 2000);
            },
            reconnectOnError(error: Error): boolean {
                /* istanbul ignore next */
                return error.message.includes('ECONNRESET');
            },
            ...input.options,
        },
    });
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
