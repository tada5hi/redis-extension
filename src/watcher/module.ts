/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from 'node:events';
import type { Redis } from 'ioredis';
import { escapeKey } from '../key';
import type { WatcherEvent } from './consants';
import type { WatcherOptions } from './types';

export class Watcher extends EventEmitter {
    protected client: Redis;

    protected subscriberClient : Redis | undefined;

    protected starting : Promise<void> | undefined;

    protected subscribePatterns: string[];

    /**
     * Fixed start of every subscribed channel: the keyspace channel of the
     * client database, followed by the client keyPrefix.
     */
    protected channelPrefix: string;

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
            patterns = Array.isArray(this.options.pattern) ?
                this.options.pattern :
                [this.options.pattern];
        } else {
            patterns = ['*'];
        }

        // ioredis applies keyPrefix to commands, but not to pattern subscriptions
        const keyPrefix = client.options.keyPrefix || '';

        this.channelPrefix = `__keyspace@${client.options.db || 0}__:${keyPrefix}`;

        const channelPattern = `__keyspace@${client.options.db || 0}__:${escapeKey(keyPrefix)}`;

        this.subscribePatterns = patterns.map((pattern) => `${channelPattern}${pattern}`);
    }

    //--------------------------------------------------------------------

    override on(event: `${WatcherEvent}`, listener: (key: string) => any) : this;

    override on(event: 'error', listener: (error: Error) => any) : this;

    override on(event: string, listener: (...args: any[]) => any) : this {
        return super.on(event, listener);
    }

    /**
     * Subscribe to the keyspace notifications. Calls while the watcher is
     * starting or running share that start.
     */
    async start() : Promise<void> {
        if (!this.starting) {
            this.starting = this.subscribe().catch((error) => {
                this.starting = undefined;

                throw error;
            });
        }

        return this.starting;
    }

    async stop() : Promise<void> {
        const { starting } = this;

        if (!starting) {
            return;
        }

        this.starting = undefined;

        try {
            await starting;
        } catch {
            return;
        }

        const subscriber = this.subscriberClient!;

        this.subscriberClient = undefined;

        try {
            await subscriber.punsubscribe(...this.subscribePatterns);
        } finally {
            subscriber.disconnect();
        }
    }

    protected async subscribe() : Promise<void> {
        const subscriber = this.client.duplicate();

        const { notifyKeyspaceEvents = 'KA' } = this.options;

        try {
            if (notifyKeyspaceEvents !== false) {
                await subscriber.config('SET', 'notify-keyspace-events', notifyKeyspaceEvents);
            }

            await subscriber.psubscribe(...this.subscribePatterns);
        } catch (error) {
            subscriber.disconnect();

            throw error;
        }

        subscriber.on('error', (error) => {
            this.emit('error', error);
        });

        subscriber.on('pmessage', (pattern: string, channel: string, event: string) => {
            if (!this.subscribePatterns.includes(pattern)) {
                return;
            }

            const key = channel.substring(this.channelPrefix.length);

            if (key.length > 0) {
                this.emit(event, key);
            }
        });

        this.subscriberClient = subscriber;
    }
}
