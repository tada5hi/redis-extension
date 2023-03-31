/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {useConfig, setConfig, buildConfigWithDefaults, unsetConfig, hasConfig} from "../../../src";

describe('src/config', () => {
    it('should set & get redis config', () => {
        setConfig({
            connectionString: 'foo'
        });

        let config = useConfig();
        expect(config).toBeDefined();
        expect(config.connectionString).toEqual('foo');
        expect(config.options).toBeDefined();

        config = useConfig('foo');
        expect(config).toBeDefined();
        expect(config.connectionString).toBeUndefined();
        expect(config.options).toBeDefined();

        unsetConfig();
    });

    it('should set, check and unset config', () => {
        expect(hasConfig()).toBeFalsy();

        setConfig({
            connectionString: 'foo'
        });

        expect(hasConfig()).toBeTruthy();

        unsetConfig();

        expect(hasConfig()).toBeFalsy();
    })

    it('should build config with defaults', () => {
        const config = buildConfigWithDefaults();
        expect(config.options.enableReadyCheck).toEqual(true);
        expect(config.options.reconnectOnError).toBeDefined();
    })

    it('should set & get redis config with options', () => {
        setConfig({
            options: {
                role: "master"
            }
        });

        let config = useConfig('default');
        expect(config).toBeDefined();
        expect(config.options).toBeDefined();
        expect(config.options.role).toEqual('master');

        config = useConfig('foo');
        expect(config).toBeDefined();
        expect(config.connectionString).toBeUndefined();
        expect(config.options).toBeDefined();
        expect(config.options.role).toBeUndefined();
    });
})
