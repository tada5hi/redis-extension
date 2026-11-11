/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Redis } from 'ioredis';
import type { SubscriberListener } from './types';


const subscribers = new WeakMap<Redis, Subscriber>();

/**
 * One pattern-subscribed duplicate connection per Redis connection, shared
 * by every watcher of that connection. Patterns are counted per listener,
 * and add() and remove() run one after another, so overlapping starts and
 * stops cannot leak or lose the connection.
 */
export class Subscriber {
    protected client: Redis;

    protected connection : Redis | undefined;

    protected listeners = new Map<string, Set<SubscriberListener>>();

    protected queue : Promise<unknown> = Promise.resolve();

    protected constructor(client: Redis) {
        this.client = client;
    }

    static for(client: Redis) : Subscriber {
        let subscriber = subscribers.get(client);

        if (!subscriber) {
            subscriber = new Subscriber(client);
            subscribers.set(client, subscriber);
        }

        return subscriber;
    }

    /**
     * Subscribe the listener to the patterns.
     *
     * @param notifyKeyspaceEvents value for CONFIG SET notify-keyspace-events, or false to skip it
     */
    add(
        patterns: string[],
        listener: SubscriberListener,
        notifyKeyspaceEvents: string | false,
    ) : Promise<void> {
        return this.enqueue(async () => {
            const connection = this.connect();

            try {
                // on the client: a subscribed RESP2 connection rejects CONFIG
                if (notifyKeyspaceEvents !== false) {
                    await this.client.config('SET', 'notify-keyspace-events', notifyKeyspaceEvents);
                }

                const fresh = patterns.filter((pattern) => !this.listeners.has(pattern));

                if (fresh.length > 0) {
                    await connection.psubscribe(...fresh);
                }
            } catch (error) {
                if (this.listeners.size === 0) {
                    this.disconnect();
                }

                throw error;
            }

            for (const pattern of patterns) {
                let listeners = this.listeners.get(pattern);

                if (!listeners) {
                    listeners = new Set();
                    this.listeners.set(pattern, listeners);
                }

                listeners.add(listener);
            }
        });
    }

    /**
     * Unsubscribe the listener from the patterns. The connection closes with
     * the last pattern.
     */
    remove(patterns: string[], listener: SubscriberListener) : Promise<void> {
        return this.enqueue(async () => {
            const unused : string[] = [];

            for (const pattern of patterns) {
                const listeners = this.listeners.get(pattern);

                if (listeners) {
                    listeners.delete(listener);

                    if (listeners.size === 0) {
                        this.listeners.delete(pattern);
                        unused.push(pattern);
                    }
                }
            }

            if (this.listeners.size === 0) {
                this.disconnect();

                return;
            }

            if (unused.length > 0 && this.connection) {
                await this.connection.punsubscribe(...unused);
            }
        });
    }

    protected enqueue<T>(operation: () => Promise<T>) : Promise<T> {
        const result = this.queue.then(operation, operation);

        this.queue = result.catch(() => undefined);

        return result;
    }

    protected connect() : Redis {
        if (this.connection) {
            return this.connection;
        }

        // cluster nodes never reconnect (retryStrategy null), since the cluster
        // refreshes its slots instead; the subscriber has to reconnect itself,
        // and ioredis then restores its pattern subscriptions
        const connection = this.client.duplicate(
            this.client.options.retryStrategy ?
                {} :
                { retryStrategy: (times: number) => Math.min(times * 50, 2000) },
        );

        connection.on('pmessage', (pattern: string, channel: string, event: string) => {
            const listeners = this.listeners.get(pattern);

            if (listeners) {
                for (const listener of listeners) {
                    listener.message(pattern, channel, event);
                }
            }
        });

        connection.on('error', (error: Error) => {
            const notified = new Set<SubscriberListener>();

            for (const listeners of this.listeners.values()) {
                for (const listener of listeners) {
                    if (!notified.has(listener)) {
                        notified.add(listener);
                        listener.error(error);
                    }
                }
            }
        });

        this.connection = connection;

        return connection;
    }

    /**
     * Close the connection. The subscriber stays registered for its client,
     * so a queued or later add() reconnects the same instance.
     */
    protected disconnect() {
        if (!this.connection) {
            return;
        }

        this.connection.disconnect();
        this.connection = undefined;
    }
}
