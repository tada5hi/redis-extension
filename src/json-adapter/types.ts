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

export type JSONAdapterOptions<T = any> = {
    /**
     * Turn a value into the stored text. May resolve asynchronously.
     *
     * default: JSON.stringify
     */
    stringify?: (value: T) => string | Promise<string>,
    /**
     * Turn the stored text into a value, e.g. to validate it or to revive
     * Date values. May resolve asynchronously. Throw or reject to read the
     * value as undefined.
     *
     * default: JSON.parse
     */
    parse?: (text: string) => T | Promise<T>
};
