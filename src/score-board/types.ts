/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ScoreBoardItem = {
    id: string,
    score: number
};

export type ScoreBoardOptions = {
    key: string
};

export type ScoreBoardOptionsInput = Partial<ScoreBoardOptions>;

export type ScoreBoardGetManyOptions = {
    limit?: number,
    offset?: number,
    /**
     * default: 'DESC'
     */
    sort?: 'ASC' | 'DESC'
};
