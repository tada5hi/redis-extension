/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from 'node:events';
import type { Redis } from 'ioredis';
import type { WatcherEvent } from './consants';
import type { WatcherOptions } from './types';
import type { Key } from '../key';
import { parseKey } from '../key';

export class Watcher extends EventEmitter {
    protected client: Redis;

    protected subscriberClient : Redis | undefined;

    protected subscribePattern: string;

    protected options : WatcherOptions;

    //--------------------------------------------------------------------

    constructor(
        client: Redis,
        options: WatcherOptions = {},
    ) {
        super();

        this.client = client;
        this.options = options;

        let pattern : string;
        if (this.options.prefix) {
            pattern = `__key*__:${this.options.prefix.replace(/([*?[\]\\])/g, '\\$1')}*`;
        } else {
            pattern = '__key*__:*';
        }

        this.subscribePattern = pattern;
    }

    //--------------------------------------------------------------------

    override on(event: `${WatcherEvent}`, listener: (key: Key) => any) : this;

    override on(event: 'error', listener: (error: Error) => any) : this;

    override on(event: string, listener: (...args: any[]) => any) : this {
        return super.on(event, listener);
    }

    /* istanbul ignore next */
    async start() : Promise<void> {
        if (this.subscriberClient) {
            return;
        }

        const subscriber = this.client.duplicate();

        await subscriber.config('SET', 'notify-keyspace-events', 'KA');

        await subscriber.psubscribe(this.subscribePattern);

        const handleMessage = (key: string, event: string) => {
            const result = parseKey(key);

            this.emit(event, result);
        };

        subscriber.on('error', (error) => {
            this.emit('error', error);
        });

        subscriber.on('pmessage', (_pattern, _channel, event) => {
            if (_pattern !== this.subscribePattern) {
                return;
            }

            if (!_channel.startsWith('__keyspace')) {
                return;
            }

            const key = _channel.split('__:').pop();
            if (key && key.length > 0) {
                handleMessage(key, event);
            }
        });

        this.subscriberClient = subscriber;
    }

    /* istanbul ignore next */
    async stop() : Promise<void> {
        if (!this.subscriberClient) return;

        await this.subscriberClient.punsubscribe(this.subscribePattern);
        this.subscriberClient.disconnect();
        this.subscriberClient = undefined;
    }
}
