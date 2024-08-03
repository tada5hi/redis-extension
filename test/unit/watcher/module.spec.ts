/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../../../src';
import { Watcher, createClient } from '../../../src';

describe('watcher', () => {
    let client: Client;

    beforeAll(async () => {
        client = createClient({
            connectionString: process.env.REDIS_CONNECTION_STRING,
        });
    });

    afterAll(async () => {
        client.disconnect();
    });

    it('fire started & stopped event', (done) => {
        expect.assertions(2);

        const watcher = new Watcher(client);
        watcher.on('started', () => {
            expect(true).toBeTruthy();
            watcher.stop();
        });

        watcher.on('stopped', () => {
            expect(true).toBeTruthy();
            done();
        });

        Promise.resolve()
            .then(() => watcher.start());
    });

    it('should fire expired event', (done) => {
        expect.assertions(1);

        const watcher = new Watcher(client);
        watcher.on('expired', (result) => {
            expect(result.id).toEqual('foo');

            watcher.stop();

            done();
        });

        Promise.resolve()
            .then(() => watcher.start())
            .then(() => client.set('foo', 'bar', 'PX', 300));
    });
});
