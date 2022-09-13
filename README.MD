# Redis Extension 🍬

[![npm version](https://badge.fury.io/js/redis-extension.svg)](https://badge.fury.io/js/redis-extension)
[![main](https://github.com/tada5hi/redis-extension/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/redis-extension/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/tada5hi/redis-extension/branch/master/graph/badge.svg?token=0VL41WO0CG)](https://codecov.io/gh/tada5hi/redis-extension)

This is a library to
- manage singleton client & cluster instances
- cache entity identifiers in groups for a given time with scheduler to trigger callback(s) on expiration.
- track entity identifiers in groups by creation date.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Config](#config)
  - [Singleton](#singleton)
  - [Cache](#cache)
  - [Tracker](#tracker)

## Installation

```bash
npm install redis-extension --save
```

---
**Important NOTE**

The public API is still in progress and in development ☂ and can still can change therefore until the v1.0.0 release.
So please stay patient, till it is fully available ⭐.

---

## Usage

### Config

To create a configuration for the driver `Client` or `Cluster`, a configuration must be specified,
like described in the following:

**Client**

```typescript
import {
    setConfig
} from "redis-extension";

setConfig({
    connectionString: 'redis://127.0.0.1',
    options: {
        reconnectOnError(error: Error): boolean {
            return true;
        }
    }
}, 'alias');
```

A configuration is always identified by a string, in this example: `alias` (default: `default`),
so multiple configurations can be registered.

In the upper example, the **options** property is used to pass information to the underneath driver (IORedis) and the **connectionString** (optional) property is a way
to specify the Redis server to which the driver should connect to.

**Cluster**

```typescript
import {
    setConfig
} from "redis-extension";

setConfig({
    clusterNodes: [
        'redis://127.0.0.1'
    ],
    clusterOptions: {
        // ...
    }
}, 'alias');
```

## Singleton

A singleton instance associated for a given configuration key,
can be acquired like described in the following:

**Client**
```typescript
import {
    useClient
} from "redis-extension";

const client = useClient('alias');

(async () => {
    await client.set('key', 'value');
    const payload = await client.get('key');
    console.log(payload);
    // value
})();
```

**Cluster**
```typescript
import {
    useCluster
} from "redis-extension";

const cluster = useCluster('alias');

(async () => {
    await cluster.set('key', 'value');
    const payload = await cluster.get('key');
    console.log(payload);
    // value
})();
```

### Cache

The cache sub-module requires a Redis instance,
which can either be created with this library or with the underneath ioredis driver itself.

```typescript
import {
    Cache,
    useClient
} from "redis-extension";

(async () => {
    type User = {
        id: number,
        name: string,
        realm_id: string
    };

    const cache = new Cache<number, User>(
        {
            redis: useClient()
        },
        {
            prefix: 'user',
            context: {
                realm_id: 'master'
            }
        }
    );

    // Register events
    cache.on('expired', (data) => {
        console.log(data);
        // { id: 'foo', prefix: 'user', context: {realm_id: 'master'}

        // Important: The value will not be part of the expired event payload!
    });

    // Start scheduler to watch cached entries and trigger specific events.
    await cache.start();

    await cache.set('foo', 'bar');
    const payload = cache.get('foo');
    console.log(payload);
    // bar
});
```

### Tracker

```typescript
import {
    Tracker,
    useClient
} from "redis-extension";

(async () => {
    const tracker = new Tracker<number>(
        {
            redis: useClient()
        },
        {
            prefix: 'users-online'
        }
    );

    // add user with id: 1 to the stack (time: 1642423766)
    tracker.add(1);

    // add user with id: 2 to the stack (time: 1642423866)
    tracker.add(2);

    const items = tracker.getMeta({
        sort: 'DESC'
    });

    console.log(items);
    // {
    //      data: [
    //          {id: 1, score: 1642423766},
    //          {id: 2, score: 1642423866}
    //      ],
    //      meta: {}
    // }
})();

```

The `score` property represents the unix timestamp, when the entry was added.
