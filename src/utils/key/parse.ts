/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyPathID, KeyPathParseResult, KeyReference } from '../../type';

export function parseKeyPath<
    K extends string | number = string | number,
    O extends KeyReference = never,
>(
    keyPath: string,
) : KeyPathParseResult<K, O> | undefined {
    keyPath = keyPath.replace(/\s/g, '');
    const matches = /([A-Za-z0-9-_]+)*({[A-Z0-9a-z,_\-:]+})*[#]([A-Za-z0-9-_]+)[.]?([A-Za-z0-9-_]+)*/g.exec(keyPath);
    if (!matches) {
        return undefined;
    }

    let context : Record<string, any> | undefined;

    if (matches[2]) {
        context = {};

        matches[2] = matches[2].substring(1);
        matches[2] = matches[2].substring(0, matches[2].length - 1);
        const parts = matches[2].split(',');

        for (let i = 0; i < parts.length; i++) {
            const [key, value] = parts[i].split(':');

            if (parseInt(value, 10) === Number(value)) {
                context[key] = parseInt(value, 10);
            } else {
                context[key] = value;
            }
        }
    }

    const result : KeyPathParseResult<K, O> = {
        id: (parseInt(matches[3], 10) === Number(matches[3]) ?
            parseInt(matches[3], 10) :
            matches[3]) as KeyPathID<K, O>,
    };

    if (matches[1]) {
        // eslint-disable-next-line prefer-destructuring
        result.prefix = matches[1];
    }

    if (context) {
        result.context = context as Partial<O>;
    }

    if (matches[4]) {
        // eslint-disable-next-line prefer-destructuring
        result.suffix = matches[4];
    }

    return result;
}
