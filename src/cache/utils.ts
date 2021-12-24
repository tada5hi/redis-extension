/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityCacheOptions } from './type';
import { EntityKeyType } from '../type';
import { setDefaultBuildPathFunction } from '../utils';

export function extendEntityCacheDefaultOptions<
    T extends EntityKeyType,
>(options: EntityCacheOptions<T>) : EntityCacheOptions<T> {
    return setDefaultBuildPathFunction(options);
}
