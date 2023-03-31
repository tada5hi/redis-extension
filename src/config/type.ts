/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientOptions, ClusterNode, ClusterOptions } from '../driver/type';

export type Config = {
    options: ClientOptions,
    connectionString?: string,
    clusterNodes: ClusterNode[],
    clusterOptions: ClusterOptions
};

export type ConfigInput = Partial<Config>;
