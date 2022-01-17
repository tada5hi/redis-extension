/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TrackerOptions } from './type';
import { KeyContext } from '../type';

export function extendRedisTrackerDefaultOptions<
    T extends KeyContext,
>(options: TrackerOptions) : TrackerOptions {
    return options;
}
