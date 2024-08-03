/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type TrackerItem<ID> = {
    id: ID,
    score: number
};

export type TrackerOptions = {
    prefix?: string,
    suffix?: string
};

export type TrackerGetManyOptions = {
    limit?: number,
    offset?: number,
    /**
     * default: 'DESC'
     */
    sort?: 'ASC' | 'DESC'
};
