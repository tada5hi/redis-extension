/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* istanbul ignore next */
export enum WatcherEvent {
    COPY_TO = 'copy_to',
    DEL = 'del',
    EXPIRE = 'expire',
    HDEL = 'hdel',
    HEXPIRE = 'hexpire',
    /**
     * When fields expire.
     */
    HEXPIRED = 'hexpired',
    HINCRBYFLAOT = 'hincrbyfloat',
    HINCRBY = 'hincrby',
    HPERSIST = 'hpersist',
    /**
     * Commands: HSET, HSETNX, HMSET
     */
    HSET = 'hset',
    INCRBYFLOAT = 'incrbyfloat',
    /**
     * Commands: INCR, DECR, INCRBY, DECRBY
     */
    INCRBY = 'incrby',
    LINSERT = 'linsert',
    /**
     * Commands: LPOP (LMOVE, BMOVE)
     */
    LPOP = 'lpop',
    /**
     * Commands: LPUSH, LPUSHX (LMOVE, BMOVE)
     */
    LPUSH = 'lpush',
    LREM = 'lrem',
    LSET = 'lset',
    LTRIM = 'ltrim',

    MOVE_TO = 'move_to',
    MOVE_FROM = 'move_from',

    PERSIST = 'persist',

    RENAME_FROM = 'rename_from',
    RENAME_TO = 'rename_to',

    RESTORE = 'restore',

    /**
     * Commands: (LMOVE, BMOVE)
     */
    RPOP = 'rpop',
    /**
     * Commands: (LMOVE, BMOVE)
     */
    RPUSH = 'rpush',

    SADD = 'sadd',
    SREM = 'srem',
    SPOP = 'spop',

    SETRANGE = 'setrange',

    SET = 'set',

    SINTERSTORE = 'sinterstore',
    SUNIONSTORE = 'sunionstore',
    SIDFFSTORE = 'sdiffstore',
    SORTSTORE = 'sortstore',

    XADD = 'xadd',
    XTRIM = 'xtrim',
    XDEL = 'xdel',

    XGROUP_CREATECONSUMER = 'xgroup-createconsumer',
    XGROUP_CREATE = 'XGROUP_CREATE',
    XGROUP_DELCONSUMER = 'xgroup-delcosnumer',
    XGROUP_DESTROY = 'xgroup-destroy',
    XGROUP_SETID = 'xgroup-setid',
    XSETID = 'xsetid',

    ZADD = 'zadd',

    ZDIFFSTORE = 'zdiffstore',
    ZINTERSTORE = 'zinterstore',
    ZUNIONSTORE = 'zunionstore',

    ZINCR = 'zincr',
    ZREMBYRANK = 'zrembyrank',
    ZREMBYSCORE = 'zrembyscore',
    ZREM = 'zrem',

}
