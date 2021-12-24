/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventEmitter } from 'events';
import { Job, scheduleJob } from 'node-schedule';
import { EntityCacheContext, EntityCacheOptions } from './type';
import { EntityIDType, EntityKeyType } from '../type';
import { extendEntityCacheDefaultOptions } from './utils';

export class EntityCache<
    K extends EntityKeyType,
    ID extends EntityIDType,
> extends EventEmitter {
    protected scheduler : Job | undefined;

    protected schedulerLocked = false;

    protected schedulerLastChecked : Record<string, number>;

    protected context : EntityCacheContext;

    protected options : EntityCacheOptions<K>;

    //--------------------------------------------------------------------

    constructor(context: EntityCacheContext, options: EntityCacheOptions<K>) {
        super();

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

    async isExpired(id: ID, context?: {key?: K}) : Promise<boolean> {
        context ??= {};
        const idPath = this.buildIDPath(id, context.key);

        if (Object.prototype.hasOwnProperty.call(this.schedulerLastChecked, idPath)) {
            return false;
        }

        const ttl = await this.context.redisDatabase.ttl(idPath);

        return ttl <= 0;
    }

    async set(id: ID, value?: any, context?: {seconds?: number, key?: K}) {
        context ??= {};

        const idPath = this.buildIDPath(id, context.key);
        const seconds = context.seconds ?? this.options.seconds ?? 300;

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

    async get(id: ID, context?: {key?: K}) : Promise<undefined | any> {
        context ??= {};

        const idPath = this.buildIDPath(id, context.key);

        try {
            const entry = await this.context.redisDatabase.get(idPath);
            if (entry === null) {
                return undefined;
            }

            return JSON.parse(entry);
        } catch (e) {
            return undefined;
        }
    }

    async drop(id: ID, context?: {key?: K}) : Promise<boolean> {
        const idPath = this.buildIDPath(id, context.key);

        if (Object.prototype.hasOwnProperty.call(this.schedulerLastChecked, idPath)) {
            delete this.schedulerLastChecked[idPath];
        }

        return await this.context.redisDatabase.del(idPath) === 1;
    }

    //--------------------------------------------------------------------

    buildIDPath(id: ID, key?: K) {
        return `${this.options.buildPath(key)}:${id}`;
    }
}
