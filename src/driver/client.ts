/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import IORedis from 'ioredis';
import { Config, useConfig } from '../config';
import { Client } from './type';

const getAlias = (key?: string) => key || 'default';

const instances: Record<string, Client> = {};

export function useClient(alias?: string) : Client {
    alias = getAlias(alias);

    const config = useConfig(alias);

    if (Object.prototype.hasOwnProperty.call(instances, alias)) {
        return instances[alias];
    }

    instances[alias] = createClient(config);

    return instances[alias];
}

export function hasClient(alias?: string) {
    alias = getAlias(alias);

    return Object.prototype.hasOwnProperty.call(instances, alias);
}

export function setClient(value: Client, alias?: string) : Client {
    alias = getAlias(alias);

    instances[alias] = value;

    return instances[alias];
}

export function createClient(config?: Config) : Client {
    config ??= {};

    return new IORedis(
        config.connectionString,
        config.options,
    );
}
