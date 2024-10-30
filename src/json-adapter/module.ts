/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../driver';
import type { JSONAdapterSetOptions } from './types';

export class JsonAdapter {
    protected client : Client;

    constructor(client: Client) {
        this.client = client;
    }

    async set(key: string, value: any, options: JSONAdapterSetOptions = {}) {
        let milliseconds : number | undefined;
        if (options.milliseconds) {
            milliseconds = options.milliseconds;
        } else if (options.seconds) {
            milliseconds = options.seconds * 1000;
        }

        /* istanbul ignore next */
        if (options.keepTTL) {
            if (options.ifExists) {
                await this.client.set(key, JSON.stringify(value), 'KEEPTTL', 'XX');
            } else if (options.ifNotExists) {
                await this.client.set(key, JSON.stringify(value), 'KEEPTTL', 'NX');
            } else {
                await this.client.set(key, JSON.stringify(value), 'KEEPTTL');
            }

            return;
        }

        if (milliseconds) {
            if (options.ifExists) {
                await this.client.set(key, JSON.stringify(value), 'PX', milliseconds, 'XX');
            } else if (options.ifNotExists) {
                await this.client.set(key, JSON.stringify(value), 'PX', milliseconds, 'NX');
            } else {
                await this.client.set(key, JSON.stringify(value), 'PX', milliseconds);
            }

            return;
        }

        await this.client.set(key, JSON.stringify(value));
    }

    async get<T = any>(key: string) : Promise<undefined | T> {
        try {
            const entry = await this.client.get(key);
            if (entry === null || typeof entry === 'undefined') {
                return undefined;
            }

            return JSON.parse(entry) as T;
        } catch (e) {
            /* istanbul ignore next */
            return undefined;
        }
    }

    async drop(key: string) : Promise<boolean> {
        return await this.client.del(key) === 1;
    }
}
