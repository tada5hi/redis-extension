/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import IORedis from 'ioredis';
import { Config, useConfig } from '../config';
import { Client } from './type';

const instanceMap: Record<string, Client> = {};

export function useClient(alias?: string) : Client {
    alias = alias || 'default';

    const config = useConfig(alias);

    if (Object.prototype.hasOwnProperty.call(instanceMap, alias)) {
        return instanceMap[alias];
    }

    instanceMap[alias] = createClient(config);

    return instanceMap[alias];
}

export function setClient(value: Client, alias?: string) : Client {
    alias = alias || 'default';

    instanceMap[alias] = value;

    return instanceMap[alias];
}

export function createClient(config?: Config) : Client {
    config ??= {};

    return new IORedis(
        config.connectionString,
        config.options,
    );
}
