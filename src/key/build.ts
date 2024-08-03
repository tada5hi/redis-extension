/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeySeparator } from './constants';
import type { Key } from './types';

export function stringifyKey(options: Key) : string {
    const parts = [];
    if (options.prefix) {
        parts.push(options.prefix);
        parts.push(KeySeparator.PREFIX);
    }

    parts.push(options.id);

    if (options.suffix) {
        parts.push(KeySeparator.SUFFIX);
        parts.push(options.suffix);
    }

    return parts.join('');
}
