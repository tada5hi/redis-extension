/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {buildKeyPath, parseKeyPath} from "../../../../src";

describe('src/utils/key/parse.ts', function () {
    it('should parse simple path', () => {
        let result = parseKeyPath('');
        expect(result).toBeUndefined();

        result = parseKeyPath('#id');
        expect(result).toEqual({id: 'id'});

        result = parseKeyPath('#1');
        expect(result).toEqual({id: 1});

        result = parseKeyPath('#123e4567-e89b-12d3-a456-426614174000');

        expect(result).toEqual({id: '123e4567-e89b-12d3-a456-426614174000'})
    });

    it('should parse key with prefix & suffix', () => {
        let result = parseKeyPath('prefix#id');

        expect(result).toBeDefined();
        expect(result).toEqual({id: 'id', prefix: 'prefix'});

        result = parseKeyPath('#id.suffix');

        expect(result).toBeDefined();
        expect(result).toEqual({id: 'id', suffix: 'suffix'});

        result = parseKeyPath('prefix#id.suffix');

        expect(result).toBeDefined();
        expect(result).toEqual({id: 'id', prefix: 'prefix', suffix: 'suffix'});
    });

    it('should parse key with context', () => {
        let result = parseKeyPath('{user_id:1}#id');
        expect(result).toEqual({id: 'id', context: {user_id: 1}})

        result = parseKeyPath('{ user_id: 1 }#id');
        expect(result.id).toEqual('id');
        expect(result.context).toEqual({user_id: 1});

        result = parseKeyPath('prefix{parent:id}#id.suffix');
        expect(result.id).toEqual('id');
        expect(result.context).toEqual({parent: 'id'});
        expect(result.prefix).toEqual('prefix');
        expect(result.suffix).toEqual('suffix');
    });

    it('should build and parse key', () => {
        const keyPath = buildKeyPath({
            context: {
                realm_id: 'master',
            },
            id: 1,
            prefix: 'foo',
            suffix: 'suffix'
        });

        expect(keyPath).toEqual('foo{realm_id:master}#1.suffix');

        const result = parseKeyPath(keyPath);

        expect(result).toBeDefined();
        expect(result.id).toEqual(1);
        expect(result.context).toEqual({realm_id: 'master'});
        expect(result.prefix).toEqual('foo');
        expect(result.suffix).toEqual('suffix');
    })
});
