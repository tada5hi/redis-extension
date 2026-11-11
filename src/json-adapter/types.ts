/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type JSONAdapterSetOptions = {
    seconds?: number,
    milliseconds?: number,
    ifNotExists?: boolean, // (NX)
    ifExists?: boolean // (XX)
    keepTTL?: boolean // (KEEPTTL)
};

export type JSONAdapterSerializer = {
    stringify: (value: any) => string,
    parse: (text: string) => unknown
};

export type JSONAdapterOptions<T = any> = {
    /**
     * Validate or transform a deserialized value. Throw to reject it;
     * a rejected value reads as undefined.
     */
    parse?: (value: unknown) => T,
    /**
     * Replace JSON.stringify and JSON.parse, e.g. to keep Date values.
     *
     * default: JSON
     */
    serializer?: JSONAdapterSerializer
};
