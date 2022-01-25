/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type KeyReference = Record<string, any>;

export type KeyOptions<
    K extends string | number = string | number,
    O extends KeyReference = never,
> = {
    id?: KeyPathID<K, O>,
    prefix?: string,
    suffix?: string,
    context?: Partial<O>
};

export type KeyPathParseResult<
    K extends string | number = string | number,
    O extends KeyReference = never,
> = {
    prefix?: string,
    context?: Partial<O>,
    id: KeyPathID<K, O>,
    suffix?: string
};

export type KeyPathID<
    K extends string | number = string | number,
    O extends KeyReference = never,
> = K extends keyof O ? (O[K] extends never ? K : O[K]) : K;
