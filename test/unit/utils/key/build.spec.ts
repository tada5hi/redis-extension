/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildKeyPath } from "../../../../src";

describe('src/utils/key.ts', function () {
    it('should build path', () => {

        let buildPath = buildKeyPath({});
        expect(buildPath).toEqual('');

        buildPath = buildKeyPath({id: 'id'});

        expect(buildPath).toEqual('#id');
    })

    it('should build path with prefix & suffix', () => {
        let buildPath = buildKeyPath( {
            prefix: 'prefix',
            suffix: 'suffix'
        });

        expect(buildPath).toEqual('prefix.suffix');

        buildPath = buildKeyPath({
            id: 'id',
            prefix: 'prefix',
            suffix: 'suffix'
        });

        expect(buildPath).toEqual('prefix#id.suffix');
    });

    it('should build path with context', () => {
        let buildPath = buildKeyPath({context: {realm_id: 'master'}});
        expect(buildPath).toEqual('{realm_id:master}');

        buildPath = buildKeyPath({id: 'id', context: {realm_id: 'master'}});

        expect(buildPath).toEqual('{realm_id:master}#id');
    })

    it('should build path with context, prefix & suffix', () => {
        let buildPath = buildKeyPath( {
            context: {realm_id: 'master'},
            prefix: 'prefix',
            suffix: 'suffix'
        });

        expect(buildPath).toEqual('prefix{realm_id:master}.suffix');

        buildPath = buildKeyPath({
            id: 'id',
            context: {realm_id: 'master'},
            prefix: 'prefix',
            suffix: 'suffix'
        });

        expect(buildPath).toEqual('prefix{realm_id:master}#id.suffix');
    })
});
