/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type EntityIDType = string | number;
export type EntityKeyType = string | number | Record<string, any>;

export type EntityBaseOptions<K> = {
    buildPath?: (key: K) => string
};
