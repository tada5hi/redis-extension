/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildKeyPath, parseKeyPath } from '../../../src';
import { KeyPathSeparator } from '../../../src/key/path/constants';

describe('src/utils/key.ts', () => {
    it('should build path', () => {
        const buildPath = buildKeyPath({ key: 'id' });

        expect(buildPath).toEqual('id');
    });

    it('should build path with prefix & suffix', () => {
        const buildPath = buildKeyPath({
            key: 'id',
            prefix: 'prefix',
            suffix: 'suffix',
        });

        expect(buildPath).toEqual(`prefix${KeyPathSeparator.PREFIX}id${KeyPathSeparator.SUFFIX}suffix`);
    });

    it('should parse key', () => {
        let result = parseKeyPath('id');

        expect(result).toBeDefined();
        expect(result).toEqual({ key: 'id' });

        result = parseKeyPath(`${KeyPathSeparator.PREFIX}id`);

        expect(result).toBeDefined();
        expect(result).toEqual({ key: 'id' });

        result = parseKeyPath(`id${KeyPathSeparator.SUFFIX}`);

        expect(result).toBeDefined();
        expect(result).toEqual({ key: 'id' });
    });

    it('should parse key with prefix', () => {
        let result = parseKeyPath(`prefix${KeyPathSeparator.PREFIX}id`);

        expect(result).toBeDefined();
        expect(result).toEqual({ key: 'id', prefix: 'prefix' });

        result = parseKeyPath(`prefix${KeyPathSeparator.PREFIX}id${KeyPathSeparator.SUFFIX}`);

        expect(result).toBeDefined();
        expect(result).toEqual({ key: 'id', prefix: 'prefix' });
    });

    it('should parse key with suffix', () => {
        let result = parseKeyPath(`id${KeyPathSeparator.SUFFIX}suffix`);

        expect(result).toBeDefined();
        expect(result).toEqual({ key: 'id', suffix: 'suffix' });

        result = parseKeyPath(`${KeyPathSeparator.PREFIX}id${KeyPathSeparator.SUFFIX}suffix`);

        expect(result).toBeDefined();
        expect(result).toEqual({ key: 'id', suffix: 'suffix' });
    });

    it('should parse key with prefix & suffix', () => {
        const result = parseKeyPath(`prefix${KeyPathSeparator.PREFIX}id${KeyPathSeparator.SUFFIX}suffix`);

        expect(result).toBeDefined();
        expect(result).toEqual({ key: 'id', prefix: 'prefix', suffix: 'suffix' });
    });

    it('should build and parse key', () => {
        const keyPath = buildKeyPath({
            key: '1',
            prefix: 'prefix',
            suffix: 'suffix',
        });

        expect(keyPath).toEqual(`prefix${KeyPathSeparator.PREFIX}1${KeyPathSeparator.SUFFIX}suffix`);

        const result = parseKeyPath(keyPath);

        expect(result.key).toEqual('1');
        expect(result.prefix).toEqual('prefix');
        expect(result.suffix).toEqual('suffix');
    });
});
