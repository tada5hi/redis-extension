/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Config, ConfigInput } from './type';
import { buildConfig, buildConfigWithDefaults } from './utils';

const getAlias = (alias?: string) => alias || 'default';

const instances : Record<string, Config> = {};

export function setConfig(
    value: ConfigInput,
    alias?: string,
) {
    alias = getAlias(alias);

    instances[alias] = buildConfig(value);
}

export function hasConfig(alias?: string) {
    alias = getAlias(alias);

    return Object.prototype.hasOwnProperty.call(instances, alias);
}

export function useConfig(
    alias?: string,
): Config {
    alias = getAlias(alias);

    if (Object.prototype.hasOwnProperty.call(instances, alias)) {
        return instances[alias];
    }

    return buildConfigWithDefaults();
}

export function unsetConfig(
    alias?: string,
) {
    alias = getAlias(alias);

    if (Object.prototype.hasOwnProperty.call(instances, alias)) {
        delete instances[alias];
    }
}
