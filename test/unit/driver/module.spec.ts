import { describe, expect, it } from 'vitest';
import { createClient } from '../../../src';

describe('src/driver', () => {
    it('should apply the default client options', async () => {
        const client = createClient({ connectionString: process.env.REDIS_CONNECTION_STRING });

        try {
            expect(client.options.enableReadyCheck).toEqual(true);
            expect(client.options.reconnectOnError).toBeDefined();
            expect(client.options.retryStrategy!(1)).toEqual(50);
            expect(client.options.retryStrategy!(100)).toEqual(2000);
            expect(await client.ping()).toEqual('PONG');
        } finally {
            client.disconnect();
        }
    });

    it('should let options override the defaults', () => {
        const client = createClient({
            connectionString: process.env.REDIS_CONNECTION_STRING,
            options: { enableReadyCheck: false, lazyConnect: true },
        });

        expect(client.options.enableReadyCheck).toEqual(false);
        expect(client.options.reconnectOnError).toBeDefined();
    });
});
