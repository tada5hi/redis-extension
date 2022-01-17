/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from 'events';
import { Job, scheduleJob } from 'node-schedule';
import { CacheContext, CacheOptions } from './type';
import { EntityID, KeyContext } from '../type';
import { buildKey } from '../utils';

export declare interface Cache<
    ID extends EntityID,
    K extends KeyContext = never,
> {
    on(event: 'expired', listener: (key: string) => void): this;
    on(event: 'failed', listener: (key: string) => void): this;
    on(event: 'updated', listener: (key: string) => void): this;
    on(event: 'started', listener: (key: string) => void): this;
    on(event: 'stopped', listener: (key: string) => void): this;
    on(event: string, listener: CallableFunction): this;
}

export class Cache<
    ID extends EntityID,
    K extends KeyContext = never,
> extends EventEmitter {
    protected scheduler : Job | undefined;

    protected schedulerLocked = false;

    protected schedulerLastChecked : Record<string, number> = {};

    protected context : CacheContext;

    protected options : CacheOptions;

    //--------------------------------------------------------------------

    constructor(context: CacheContext, options?: CacheOptions) {
        super();

        options ??= {};

        this.context = context;
        this.options = options;
    }

    //--------------------------------------------------------------------

    /* istanbul ignore next */
    startScheduler() : Job {
        if (typeof this.scheduler !== 'undefined') {
            return this.scheduler;
        }

        this.scheduler = scheduleJob('*/5 * * * * *', async () => {
            if (this.schedulerLocked) return;

            this.schedulerLocked = true;

            const ttlPipeline = this.context.redis.pipeline();

            let expireKeys = Object.keys(this.schedulerLastChecked);
            expireKeys = expireKeys.filter((expireKey) => this.schedulerLastChecked[expireKey] <= parseInt(new Date().getTime().toFixed(), 10));

            for (let i = 0; i < expireKeys.length; i++) {
                ttlPipeline.ttl(expireKeys[i]);
            }

            const result = await ttlPipeline.exec();

            const delPipeline = this.context.redis.pipeline();

            for (let i = 0; i < expireKeys.length; i++) {
                const [err, time] = result[i] ? result[i] : undefined;
                if (err) {
                    this.emit('failed', expireKeys[i]);
                    if (this.schedulerLastChecked[expireKeys[i]]) {
                        delete this.schedulerLastChecked[expireKeys[i]];
                    }

                    continue;
                }

                if (time > 0) {
                    this.schedulerLastChecked[expireKeys[i]] = parseInt((new Date().getTime() + 7500).toFixed(), 10);
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

    /* istanbul ignore next */
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

        const ttl = await this.context.redis.ttl(idPath);

        return ttl <= 0;
    }

    async set(id: ID, value?: any, options?: {seconds?: number, context?: K}) {
        options ??= {};

        const idPath = this.buildRedisKey({ id, context: options.context });
        const seconds = options.seconds ?? this.options.seconds ?? 300;

        if (typeof value === 'undefined') {
            const expireSet: number = await this.context.redis.expire(idPath, seconds);

            if (expireSet === 0) {
                await this.context.redis.set(idPath, 'true', 'EX', seconds);
            }
        } else {
            await this.context.redis.set(idPath, JSON.stringify(value), 'EX', seconds);
        }

        this.schedulerLastChecked[idPath] = new Date().getTime() + (seconds * 1000);
    }

    async get(id: ID, context?: K) : Promise<undefined | any> {
        const idPath = this.buildRedisKey({ id, context });

        try {
            const entry = await this.context.redis.get(idPath);
            if (entry === null || typeof entry === 'undefined') {
                return undefined;
            }

            return JSON.parse(entry);
        } catch (e) {
            /* istanbul ignore next */
            return undefined;
        }
    }

    async drop(id: ID, context?: K) : Promise<boolean> {
        const idPath = this.buildRedisKey({ id, context });

        if (Object.prototype.hasOwnProperty.call(this.schedulerLastChecked, idPath)) {
            delete this.schedulerLastChecked[idPath];
        }

        return await this.context.redis.del(idPath) === 1;
    }

    //--------------------------------------------------------------------

    buildRedisKey(params: {id: ID, context?: K}) {
        return buildKey(params, {
            ...this.options,
            prefix: `cache${this.options.prefix ? `.${this.options.prefix}` : ''}`,
        });
    }
}
