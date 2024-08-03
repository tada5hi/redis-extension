/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeySeparator } from './constants';
import type { Key } from './types';

export function parseKey(
    keyPath: string,
) : Key {
    keyPath = keyPath.replace(/\s/g, '');

    let prefix : string | undefined;
    let suffix : string | undefined;

    const prefixSeparatorIndex = keyPath.indexOf(KeySeparator.PREFIX);
    if (prefixSeparatorIndex !== -1) {
        prefix = keyPath.substring(0, prefixSeparatorIndex);
        keyPath = keyPath.substring(prefixSeparatorIndex + KeySeparator.PREFIX.length);
    }

    const suffixSeparatorIndex = keyPath.lastIndexOf(KeySeparator.SUFFIX);
    if (suffixSeparatorIndex !== -1) {
        suffix = keyPath.substring(suffixSeparatorIndex + KeySeparator.SUFFIX.length);
        keyPath = keyPath.substring(0, suffixSeparatorIndex);
    }

    return {
        ...(prefix ? { prefix } : {}),
        id: keyPath,
        ...(suffix ? { suffix } : {}),
    };
}
