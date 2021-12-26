/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityTrackerOptions } from './type';
import { RedisKeyContext } from '../type';

export function extendEntityTrackerDefaultOptions<
    T extends RedisKeyContext,
>(options: EntityTrackerOptions) : EntityTrackerOptions {
    return options;
}
