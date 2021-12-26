/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityCacheOptions } from './type';
import { RedisKeyContext } from '../type';

export function extendEntityCacheDefaultOptions<
    T extends RedisKeyContext,
>(options: EntityCacheOptions) : EntityCacheOptions {
    return options;
}
