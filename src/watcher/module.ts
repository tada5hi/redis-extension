/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from 'node:events';
import type { Cluster, Redis } from 'ioredis';
import { escapeKey } from '../key';
import type { WatcherEvent } from './consants';
import { Subscriber } from './subscriber';
import type { ISubscriber, SubscriberListener } from './subscriber';
import type { WatcherOptions } from './types';

type Subscription = {
    subscribers: ISubscriber[],
    listener: SubscriberListener
};

export class Watcher extends EventEmitter {
    protected client: Redis | Cluster;

    /**
     * The start in progress or done, resolving the subscription it made.
     * Each stop removes the subscription of the start it ends.
     */
    protected starting : Promise<Subscription> | undefined;

    protected subscribePatterns: string[];

    /**
     * Fixed start of every subscribed channel: the keyspace channel of the
     * client database, followed by the client keyPrefix.
     */
    protected channelPrefix: string;

    protected options : WatcherOptions;

    //--------------------------------------------------------------------

    constructor(
        client: Redis | Cluster,
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
        // a cluster only has database 0
        const db = client.isCluster ? 0 : (client as Redis).options.db || 0;

        this.channelPrefix = `__keyspace@${db}__:${keyPrefix}`;

        const channelPattern = `__keyspace@${db}__:${escapeKey(keyPrefix)}`;

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
            const starting = this.subscribe();

            this.starting = starting;

            // a failed start allows the next one, unless a stop and restart replaced it
            starting.catch(() => {
                if (this.starting === starting) {
                    this.starting = undefined;
                }
            });
        }

        await this.starting;
    }

    async stop() : Promise<void> {
        const { starting } = this;

        if (!starting) {
            return;
        }

        this.starting = undefined;

        let subscription : Subscription;

        try {
            subscription = await starting;
        } catch {
            return;
        }

        await Promise.all(subscription.subscribers.map(
            (subscriber) => subscriber.remove(this.subscribePatterns, subscription.listener),
        ));
    }

    /**
     * Stop the watcher at the end of an `await using` block.
     */
    async [Symbol.asyncDispose]() : Promise<void> {
        await this.stop();
    }

    protected async subscribe() : Promise<Subscription> {
        // a listener per start, so a stop removes only the start it ends
        const listener : SubscriberListener = {
            message: (_pattern, channel, event) => {
                const key = channel.substring(this.channelPrefix.length);

                if (key.length > 0) {
                    this.emit(event, key);
                }
            },
            error: (error) => {
                this.emit('error', error);
            },
        };

        const { notifyKeyspaceEvents = 'KA' } = this.options;
        const subscribers : ISubscriber[] = [];

        try {
            for (const node of await this.nodes()) {
                const subscriber = Subscriber.for(node);

                await subscriber.add(this.subscribePatterns, listener, notifyKeyspaceEvents);
                subscribers.push(subscriber);
            }
        } catch (error) {
            await Promise.all(subscribers.map(
                (subscriber) => subscriber.remove(this.subscribePatterns, listener).catch(() => undefined),
            ));

            throw error;
        }

        return { subscribers, listener };
    }

    /**
     * The connections whose notifications to watch: the client itself, or
     * every master of a cluster, since each node only publishes the
     * notifications of its own keys.
     */
    protected async nodes() : Promise<Redis[]> {
        if (!this.client.isCluster) {
            return [this.client as Redis];
        }

        const cluster = this.client as Cluster;

        if (cluster.status === 'wait') {
            await cluster.connect();
        } else if (cluster.status !== 'ready') {
            await this.ready(cluster);
        }

        return cluster.nodes('master');
    }

    /**
     * Wait until the cluster is ready. Errors on the way are not terminal,
     * since ioredis keeps retrying; a closed cluster is.
     */
    protected ready(cluster: Cluster) : Promise<void> {
        // only disconnect(), quit() or giving up lead to these states
        const closed = () => cluster.status === 'end' || cluster.status === 'disconnecting';

        return new Promise((resolve, reject) => {
            if (closed()) {
                reject(new Error('The cluster connection is closed.'));

                return;
            }

            const onReady = () => {
                cleanup();
                resolve();
            };
            const onEnd = () => {
                cleanup();
                reject(new Error('The cluster connection closed before it was ready.'));
            };
            // a cluster disconnected while connecting stays 'disconnecting' and
            // emits no 'end', so the status is checked as well
            const interval = setInterval(() => {
                if (closed()) {
                    onEnd();
                }
            }, 100);

            interval.unref();

            const cleanup = () => {
                clearInterval(interval);
                cluster.off('ready', onReady);
                cluster.off('end', onEnd);
            };

            cluster.on('ready', onReady);
            cluster.on('end', onEnd);
        });
    }
}
