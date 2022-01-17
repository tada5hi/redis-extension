/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type EntityID = string | number;
export type KeyContext = Record<string, any>;

export type KeyOptions = {
    prefix?: string,
    suffix?: string
};
