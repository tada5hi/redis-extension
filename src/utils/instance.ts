/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import IORedis from 'ioredis';
import { Config, useConfig } from '../config';
import { Client } from '../external';

const instanceMap: Record<string, Client> = {};

export function useInstance(alias = 'default') : Client {
    const config = useConfig(alias);

    if (Object.prototype.hasOwnProperty.call(instanceMap, alias)) {
        return instanceMap[alias];
    }

    instanceMap[alias] = createInstance(config);

    return instanceMap[alias];
}

export function createInstance(config?: Config) : Client {
    config ??= {};

    return new IORedis(
        config.connectionString,
        config.options,
    );
}
