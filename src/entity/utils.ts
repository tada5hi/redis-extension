/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RedisKeyContext, RedisKeyEntityID, RedisKeyOptions } from './type';

export function buildRedisKey<
    I extends RedisKeyEntityID,
    C extends RedisKeyContext = never,
>(params?: {context?: C, id?: I}, options?: RedisKeyOptions) {
    params ??= {};
    options ??= {};

    const parts : string[] = [];

    if (options.pathPrefix) {
        parts.push(options.pathPrefix);
    }

    if (typeof params.context !== 'undefined') {
        const out : string[] = [];

        const keys = Object.keys(params.context);
        for (let i = 0; i < keys.length; i++) {
            out.push(`${keys[i]}:${params.context[keys[i]]}`);
        }

        parts.push(`{${out.join(',')}}`);
    }

    if (typeof params.id !== 'undefined') {
        parts.push(`#${params.id}`);
    }

    if (options.pathSuffix) {
        parts.push(options.pathSuffix);
    }

    return parts.join('.');
}
