/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type RedisKeyEntityID = string | number;
export type RedisKeyContext = Record<string, any>;

export type RedisKeyOptions = {
    pathPrefix?: string,
    pathSuffix?: string
};
