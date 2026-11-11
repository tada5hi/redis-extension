/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type SubscriberListener = {
    message: (pattern: string, channel: string, event: string) => void,
    error: (error: Error) => void
};

/**
 * The pattern subscription of one Redis connection. add() and remove() run
 * one after another, so overlapping starts and stops cannot leak or lose the
 * subscription.
 */
export interface ISubscriber {
    /**
     * Subscribe the listener to the patterns.
     *
     * @param notifyKeyspaceEvents value for CONFIG SET notify-keyspace-events, or false to skip it
     */
    add(
        patterns: string[],
        listener: SubscriberListener,
        notifyKeyspaceEvents: string | false,
    ): Promise<void>;

    /**
     * Unsubscribe the listener from the patterns. The subscription ends with
     * the last pattern.
     */
    remove(patterns: string[], listener: SubscriberListener): Promise<void>;
}
