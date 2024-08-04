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

export class Watcher extends EventEmitter {
    protected client: Redis;

    protected subscriberClient : Redis | undefined;

    protected subscribePatterns: string[];

    protected options : WatcherOptions;

    //--------------------------------------------------------------------

    constructor(
        client: Redis,
        options: WatcherOptions = {},
    ) {
        super();

        this.client = client;
        this.options = options;

        let patterns : string[];
        if (this.options.pattern) {
            if (Array.isArray(this.options.pattern)) {
                patterns = this.options.pattern.map(
                    (pattern) => `__key*__:${pattern}`,
                );
            } else {
                patterns = [`__key*__:${this.options.pattern}`];
            }
        } else {
            patterns = ['__key*__:*'];
        }

        this.subscribePatterns = patterns;
    }

    //--------------------------------------------------------------------

    override on(event: `${WatcherEvent}`, listener: (key: string) => any) : this;

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

        await subscriber.psubscribe(...this.subscribePatterns);

        subscriber.on('error', (error) => {
            this.emit('error', error);
        });

        subscriber.on('pmessage', (_pattern, _channel, event) => {
            if (this.subscribePatterns.indexOf(_pattern) === -1) {
                return;
            }

            if (!_channel.startsWith('__keyspace')) {
                return;
            }

            const key = _channel.split('__:').pop();
            if (key && key.length > 0) {
                this.emit(event, key);
            }
        });

        this.subscriberClient = subscriber;
    }

    /* istanbul ignore next */
    async stop() : Promise<void> {
        if (!this.subscriberClient) return;

        await this.subscriberClient.punsubscribe(...this.subscribePatterns);
        this.subscriberClient.disconnect();
        this.subscriberClient = undefined;
    }
}
