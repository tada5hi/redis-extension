/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parseKey, stringifyKey } from '../../../src';
import { KeySeparator } from '../../../src/key/constants';

describe('src/utils/key.ts', () => {
    it('should build path', () => {
        const buildPath = stringifyKey({ id: 'id' });

        expect(buildPath).toEqual('id');
    });

    it('should build path with prefix & suffix', () => {
        const buildPath = stringifyKey({
            id: 'id',
            prefix: 'prefix',
            suffix: 'suffix',
        });

        expect(buildPath).toEqual(`prefix${KeySeparator.PREFIX}id${KeySeparator.SUFFIX}suffix`);
    });

    it('should parse key', () => {
        let result = parseKey('id');

        expect(result).toBeDefined();
        expect(result).toEqual({ id: 'id' });

        result = parseKey(`${KeySeparator.PREFIX}id`);

        expect(result).toBeDefined();
        expect(result).toEqual({ id: 'id' });

        result = parseKey(`id${KeySeparator.SUFFIX}`);

        expect(result).toBeDefined();
        expect(result).toEqual({ id: 'id' });
    });

    it('should parse key with prefix', () => {
        let result = parseKey(`prefix${KeySeparator.PREFIX}id`);

        expect(result).toBeDefined();
        expect(result).toEqual({ id: 'id', prefix: 'prefix' });

        result = parseKey(`prefix${KeySeparator.PREFIX}id${KeySeparator.SUFFIX}`);

        expect(result).toBeDefined();
        expect(result).toEqual({ id: 'id', prefix: 'prefix' });
    });

    it('should parse key with suffix', () => {
        let result = parseKey(`id${KeySeparator.SUFFIX}suffix`);

        expect(result).toBeDefined();
        expect(result).toEqual({ id: 'id', suffix: 'suffix' });

        result = parseKey(`${KeySeparator.PREFIX}id${KeySeparator.SUFFIX}suffix`);

        expect(result).toBeDefined();
        expect(result).toEqual({ id: 'id', suffix: 'suffix' });
    });

    it('should parse key with prefix & suffix', () => {
        const result = parseKey(`prefix${KeySeparator.PREFIX}id${KeySeparator.SUFFIX}suffix`);

        expect(result).toBeDefined();
        expect(result).toEqual({ id: 'id', prefix: 'prefix', suffix: 'suffix' });
    });

    it('should build and parse key', () => {
        const keyPath = stringifyKey({
            id: '1',
            prefix: 'prefix',
            suffix: 'suffix',
        });

        expect(keyPath).toEqual(`prefix${KeySeparator.PREFIX}1${KeySeparator.SUFFIX}suffix`);

        const result = parseKey(keyPath);

        expect(result.id).toEqual('1');
        expect(result.prefix).toEqual('prefix');
        expect(result.suffix).toEqual('suffix');
    });
});
