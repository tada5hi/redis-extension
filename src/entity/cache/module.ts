/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from 'events';
import { Job, scheduleJob } from 'node-schedule';
import { EntityCacheContext, EntityCacheOptions } from './type';
import { RedisKeyContext, RedisKeyEntityID } from '../type';
import { extendEntityCacheDefaultOptions } from './utils';
import { buildRedisKey } from '../utils';

export declare interface EntityCache<
    ID extends RedisKeyEntityID,
    K extends RedisKeyContext = never,
> {
    on(event: 'expired', listener: (key: string) => void): this;
    on(event: 'failed', listener: (key: string) => void): this;
    on(event: 'updated', listener: (key: string) => void): this;
    on(event: 'started', listener: (key: string) => void): this;
    on(event: 'stopped', listener: (key: string) => void): this;
    on(event: string, listener: CallableFunction): this;
}

export class EntityCache<
    ID extends RedisKeyEntityID,
    K extends RedisKeyContext = never,
> extends EventEmitter {
    protected scheduler : Job | undefined;

    protected schedulerLocked = false;

    protected schedulerLastChecked : Record<string, number> = {};

    protected context : EntityCacheContext;

    protected options : EntityCacheOptions;

    //--------------------------------------------------------------------

    constructor(context: EntityCacheContext, options?: EntityCacheOptions) {
        super();

        options ??= {};

        this.context = context;
        this.options = extendEntityCacheDefaultOptions(options);
    }

    //--------------------------------------------------------------------

    startScheduler() : Job {
        if (typeof this.scheduler !== 'undefined') {
            return this.scheduler;
        }

        this.scheduler = scheduleJob('*/10 * * * * *', async () => {
            if (this.schedulerLocked) return;

            this.schedulerLocked = true;

            const ttlPipeline = this.context.redisDatabase.pipeline();

            const expireKeys = Object.keys(this.schedulerLastChecked);
            for (let i = 0; i < expireKeys.length; i++) {
                ttlPipeline.ttl(expireKeys[i]);
            }

            const result = await ttlPipeline.exec();

            const delPipeline = this.context.redisDatabase.pipeline();

            for (let i = 0; i < expireKeys.length; i++) {
                const [err, time] = result[i] ? result[i] : undefined;
                if (err) {
                    this.emit('failed', expireKeys[i]);
                    continue;
                }

                if (time > 0) {
                    this.schedulerLastChecked[expireKeys[i]] = new Date().getTime();
                    this.emit('updated', expireKeys[i]);
                } else {
                    delPipeline.del(expireKeys[i]);

                    if (this.schedulerLastChecked[expireKeys[i]]) {
                        delete this.schedulerLastChecked[expireKeys[i]];
                    }

                    this.emit('expired', expireKeys[i]);
                }
            }

            await delPipeline.exec();

            this.schedulerLocked = false;
        });

        this.emit('started');

        return this.scheduler;
    }

    stopScheduler() : void {
        if (!this.scheduler) return;

        this.scheduler.cancel(false);
        this.scheduler = undefined;

        this.emit('stopped');
    }

    //--------------------------------------------------------------------

    async isExpired(id: ID, context?: K) : Promise<boolean> {
        const idPath = this.buildRedisKey({ id, context });

        if (Object.prototype.hasOwnProperty.call(this.schedulerLastChecked, idPath)) {
            return false;
        }

        const ttl = await this.context.redisDatabase.ttl(idPath);

        return ttl <= 0;
    }

    async set(id: ID, value?: any, options?: {seconds?: number, context?: K}) {
        options ??= {};

        const idPath = this.buildRedisKey({ id, context: options.context });
        const seconds = options.seconds ?? this.options.seconds ?? 300;

        if (typeof value === 'undefined') {
            const expireSet: number = await this.context.redisDatabase.expire(idPath, seconds);

            if (expireSet === 0) {
                await this.context.redisDatabase.set(idPath, seconds * 1000, 'EX', seconds);
            }
        } else {
            await this.context.redisDatabase.set(idPath, JSON.stringify(value), 'EX', seconds);
        }

        this.schedulerLastChecked[idPath] = new Date().getTime() + (seconds * 1000);
    }

    async get(id: ID, context?: K) : Promise<undefined | any> {
        const idPath = this.buildRedisKey({ id, context });

        try {
            const entry = await this.context.redisDatabase.get(idPath);
            if (entry === null || typeof entry === 'undefined') {
                return undefined;
            }

            return JSON.parse(entry);
        } catch (e) {
            return undefined;
        }
    }

    async drop(id: ID, context?: {key?: K}) : Promise<boolean> {
        const idPath = this.buildRedisKey({ id, context: context.key });

        if (Object.prototype.hasOwnProperty.call(this.schedulerLastChecked, idPath)) {
            delete this.schedulerLastChecked[idPath];
        }

        return await this.context.redisDatabase.del(idPath) === 1;
    }

    //--------------------------------------------------------------------

    buildRedisKey(params: {id: ID, context?: K}) {
        const keyPath = buildRedisKey(params, this.options);
        return keyPath.length > 0 ? `cache${keyPath}` : 'cache';
    }
}
