/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Redis } from 'ioredis';
import type { Client, ClientOptions, ConfigInput } from './types';

function withDefaults(options: ClientOptions = {}): ClientOptions {
    return {
        enableReadyCheck: true,
        retryStrategy(times: number): number {
            return Math.min(times * 50, 2000);
        },
        reconnectOnError(error: Error): boolean {
            return error.message.includes('ECONNRESET');
        },
        ...options,
    };
}

export function createClient(input: ConfigInput = {}) : Client {
    const options = withDefaults(input.options);

    if (input.connectionString) {
        return new Redis(input.connectionString, options);
    }

    return new Redis(options);
}
