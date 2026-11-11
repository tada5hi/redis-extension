/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type WatcherOptions = {
    /**
     * Supported glob-style patterns:
     *
     * - h?llo subscribes to hello, hallo and hxllo
     * - h*llo subscribes to hllo and heeeello
     * - h[ae]llo subscribes to hello and hallo, but not hillo
     *
     * @see https://redis.io/docs/latest/commands/psubscribe/
     */
    pattern?: string | string[],
    /**
     * Value written to the server's notify-keyspace-events setting on start().
     * The watcher only handles keyspace channels, so the value must contain
     * 'K' and the event classes to watch (e.g. 'Kg$x'); without 'K', start()
     * succeeds but no event is emitted.
     * Set to false when the server is configured already, or when the CONFIG
     * command is not allowed (e.g. on managed Redis services). The server
     * setting then needs the same flags.
     *
     * default: 'KA'
     */
    notifyKeyspaceEvents?: string | false
};
