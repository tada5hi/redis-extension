/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyPathSeparator } from './constants';
import type { KeyPath } from './types';

export function buildKeyPath(options: KeyPath) : string {
    const parts = [];
    if (options.prefix) {
        parts.push(options.prefix);
        parts.push(KeyPathSeparator.PREFIX);
    }

    parts.push(options.key);

    if (options.suffix) {
        parts.push(KeyPathSeparator.SUFFIX);
        parts.push(options.suffix);
    }

    return parts.join('');
}
