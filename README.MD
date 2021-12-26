# Redis Extension 🍬

[![npm version](https://badge.fury.io/js/redis-extension.svg)](https://badge.fury.io/js/redis-extension)
[![main](https://github.com/tada5hi/redis-extension/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/redis-extension/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/tada5hi/redis-extension/branch/master/graph/badge.svg?token=0VL41WO0CG)](https://codecov.io/gh/tada5hi/redis-extension)
---
**Important NOTE**

The public API is still in progress and in development ☂ and can still can change therefore until the v1.0.0 release.
So please stay patient, till it is fully available ⭐.
---

This is a library to
- cache entity identifiers in groups for a given time with scheduler to trigger callback(s) on expiration.
- track entity identifiers in groups by creation date.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Config & Instance](#config--instance)
  - [Cache](#cache)
  - [Tracker](#tracker)

## Installation

```bash
npm install redis-extension --save
```

## Usage

### Config & Instance

The config sub-module is required to register a configuration for a given key,
like in the following example.

```typescript
import { setRedisConfig } from "redis-extension";

setRedisConfig('key', {
    connectionString: 'redis://127.0.0.1',
    options: {
        reconnectOnError(error: Error): boolean {
            return true;
        }
    }
})
```

The **options** property is used to pass information to the underneath driver (IORedis) and the **connectionString** (optional) property is a way
to specify the Redis server to which the driver should connect to.

A singleton instance for a configuration associated to a given key, can be retrieved like described in the following:

```typescript
import { useRedisInstance, Redis } from "redis-extension";

const instance : Redis = useRedisInstance('key');

(async () => {
    await instance.set('key', 'value');
    const payload = await instance.get('key');
    console.log(payload);
    // value
})();
```

### Cache

The cache sub-module requires a Redis instance,
which can either be created with this library or with the underneath ioredis driver itself.

```typescript
import {useRedisInstance} from "./instance";
import {RedisCache} from "./module";

(async () => {
    const cache = new RedisCache<number>(
        {
            redisDatabae: useRedisInstance('default')
        },
        {
            prefix: 'user'
        }
    );

    // Register events
    cache.on('expired', (key: string) => {
        console.log(`Redis key ${key} expired...`);
    });

    cache.on('failed', (key: string) => {
        console.log(`Redis cache check failed for ${key}...`);
    });

    // Start scheduler to watch cached entries and trigger specific events.
    cache.startScheduler();

    await cache.set('foo', 'bar');
    const payload = cache.get('foo');
});
```

### Tracker

```typescript

```
