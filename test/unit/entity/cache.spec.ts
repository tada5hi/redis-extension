/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {buildRedisKey} from "../../../src";

describe('src/entity/utils.ts', function () {
    it('should build path', () => {

        let buildPath = buildRedisKey();
        expect(buildPath).toEqual('');

        buildPath = buildRedisKey({id: 'id'});

        expect(buildPath).toEqual('#id');
    })

    it('should build path with prefix & suffix', () => {
        let buildPath = buildRedisKey({}, {
            pathPrefix: 'prefix',
            pathSuffix: 'suffix'
        });

        expect(buildPath).toEqual('prefix.suffix');

        buildPath = buildRedisKey({id: 'id'}, {
            pathPrefix: 'prefix',
            pathSuffix: 'suffix'
        });

        expect(buildPath).toEqual('prefix.#id.suffix');
    });

    it('should build path with context', () => {
        let buildPath = buildRedisKey({context: {realm_id: 'master'}});
        expect(buildPath).toEqual('{realm_id:master}');

        buildPath = buildRedisKey({id: 'id', context: {realm_id: 'master'}});

        expect(buildPath).toEqual('{realm_id:master}.#id');
    })

    it('should build path with context, prefix & suffix', () => {
        let buildPath = buildRedisKey({context: {realm_id: 'master'}}, {
            pathPrefix: 'prefix',
            pathSuffix: 'suffix'
        });

        expect(buildPath).toEqual('prefix.{realm_id:master}.suffix');

        buildPath = buildRedisKey({id: 'id', context: {realm_id: 'master'}}, {
            pathPrefix: 'prefix',
            pathSuffix: 'suffix'
        });

        expect(buildPath).toEqual('prefix.{realm_id:master}.#id.suffix');
    })
});
