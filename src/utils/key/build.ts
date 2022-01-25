/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyOptions, KeyReference } from '../../type';

function buildKeyPathPartContext<
    O extends KeyReference = never,
>(context: Partial<O>) : string {
    const out : string[] = [];

    const keys = Object.keys(context);
    for (let i = 0; i < keys.length; i++) {
        out.push(`${keys[i]}:${context[keys[i]]}`);
    }

    return `{${out.join(',')}}`;
}

export function buildKeyPath<
    K extends string | number = string | number,
    O extends KeyReference = never,
>(options?: KeyOptions<K, O>) {
    options ??= {};

    let key = '';

    if (options.prefix) {
        key += options.prefix;
    }

    if (options.context) {
        key += buildKeyPathPartContext<O>(options.context);
    }

    if (options.id) {
        key += `#${options.id}`;
    }

    if (options.suffix) {
        key += (key.length > 0 ? '.' : '') + options.suffix;
    }

    return key;
}
