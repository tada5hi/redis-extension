/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Cluster } from '../driver';
import type { JSONAdapterSetOptions } from './types';

export class JsonAdapter {
    protected client : Client | Cluster;

    constructor(client: Client | Cluster) {
        this.client = client;
    }

    /**
     * Write the value as JSON.
     *
     * @returns true when the value was written, false when ifExists or ifNotExists skipped the write.
     */
    async set(key: string, value: any, options: JSONAdapterSetOptions = {}) : Promise<boolean> {
        const data = JSON.stringify(value);

        let milliseconds : number | undefined;

        if (options.milliseconds) {
            milliseconds = options.milliseconds;
        } else if (options.seconds) {
            milliseconds = options.seconds * 1000;
        }

        let result : string | null;

        if (options.keepTTL) {
            if (options.ifExists) {
                result = await this.client.set(key, data, 'KEEPTTL', 'XX');
            } else if (options.ifNotExists) {
                result = await this.client.set(key, data, 'KEEPTTL', 'NX');
            } else {
                result = await this.client.set(key, data, 'KEEPTTL');
            }
        } else if (milliseconds) {
            if (options.ifExists) {
                result = await this.client.set(key, data, 'PX', milliseconds, 'XX');
            } else if (options.ifNotExists) {
                result = await this.client.set(key, data, 'PX', milliseconds, 'NX');
            } else {
                result = await this.client.set(key, data, 'PX', milliseconds);
            }
        } else if (options.ifExists) {
            result = await this.client.set(key, data, 'XX');
        } else if (options.ifNotExists) {
            result = await this.client.set(key, data, 'NX');
        } else {
            result = await this.client.set(key, data);
        }

        return result === 'OK';
    }

    async get<T = any>(key: string) : Promise<undefined | T> {
        const entry = await this.client.get(key);

        if (entry === null) {
            return undefined;
        }

        try {
            return JSON.parse(entry) as T;
        } catch {
            return undefined;
        }
    }

    async drop(key: string) : Promise<boolean> {
        return await this.client.del(key) === 1;
    }
}
