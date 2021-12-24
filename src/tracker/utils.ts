/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityTrackerKeyType, EntityTrackerOptions } from './type';

export function extendDefaultOptions<T extends EntityTrackerKeyType>(options: EntityTrackerOptions<T>) : EntityTrackerOptions<T> {
    if (!options.buildKey) {
        options.buildKey = (key: T) => {
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
        };
    }

    return options;
}
