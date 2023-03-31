/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import IORedis from 'ioredis';
import type { ConfigInput } from '../config';
import { useConfig } from '../config';
import type { Client } from './type';

const getAlias = (key?: string) => key || 'default';

const instances: Record<string, Client> = {};

export function useClient(alias?: string) : Client {
    alias = getAlias(alias);

    if (Object.prototype.hasOwnProperty.call(instances, alias)) {
        return instances[alias];
    }

    const config = useConfig(alias);
    instances[alias] = createClient(config);

    return instances[alias];
}

export function unsetClient(alias?: string) {
    alias = getAlias(alias);

    if (Object.prototype.hasOwnProperty.call(instances, alias)) {
        instances[alias].disconnect();

        delete instances[alias];
    }
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

export function createClient(config?: ConfigInput) : Client {
    config = config || {};

    if (
        config.connectionString &&
        config.options
    ) {
        return new IORedis(
            config.connectionString,
            config.options,
        );
    }

    if (config.options) {
        return new IORedis(config.options);
    }

    if (config.connectionString) {
        return new IORedis(config.connectionString);
    }

    return new IORedis();
}
