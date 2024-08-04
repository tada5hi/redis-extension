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
    pattern?: string | string[]
};
