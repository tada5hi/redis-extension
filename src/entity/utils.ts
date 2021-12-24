/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityBaseOptions, EntityKeyType } from './type';

export function buildEntityKeyPath<K extends EntityKeyType>(key: K) : string {
    if (typeof key === 'string') {
        return key;
    } if (typeof key === 'number') {
        return key.toString();
    }

    const out : string[] = [];

    const keys = Object.keys(key);
    for (let i = 0; i < keys.length; i++) {
        out.push(`${keys[i]}:${key[keys[i]]}`);
    }

    return out.join('.');
}

export function setDefaultEntityBuildPathFunction<K extends EntityKeyType>(
    options: EntityBaseOptions<K>,
) {
    if (!options.buildPath) {
        options.buildPath = buildEntityKeyPath;
    }

    return options;
}
