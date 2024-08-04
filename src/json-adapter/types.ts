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
