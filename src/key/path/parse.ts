/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyPathSeparator } from './constants';
import type { KeyPath } from './types';

export function parseKeyPath(
    keyPath: string,
) : KeyPath {
    keyPath = keyPath.replace(/\s/g, '');

    let prefix : string | undefined;
    let suffix : string | undefined;

    const prefixSeparatorIndex = keyPath.indexOf(KeyPathSeparator.PREFIX);
    if (prefixSeparatorIndex !== -1) {
        prefix = keyPath.substring(0, prefixSeparatorIndex);
        keyPath = keyPath.substring(prefixSeparatorIndex + KeyPathSeparator.PREFIX.length);
    }

    const suffixSeparatorIndex = keyPath.lastIndexOf(KeyPathSeparator.SUFFIX);
    if (suffixSeparatorIndex !== -1) {
        suffix = keyPath.substring(suffixSeparatorIndex + KeyPathSeparator.SUFFIX.length);
        keyPath = keyPath.substring(0, suffixSeparatorIndex);
    }

    return {
        ...(prefix ? { prefix } : {}),
        key: keyPath,
        ...(suffix ? { suffix } : {}),
    };
}
