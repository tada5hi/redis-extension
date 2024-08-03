# Redis Extension 🍬

[![npm version](https://badge.fury.io/js/redis-extension.svg)](https://badge.fury.io/js/redis-extension)
[![main](https://github.com/tada5hi/redis-extension/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/redis-extension/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/tada5hi/redis-extension/branch/master/graph/badge.svg?token=0VL41WO0CG)](https://codecov.io/gh/tada5hi/redis-extension)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

This is a library to
- manage singleton client & cluster instances
- cache entity identifiers in groups for a given time with scheduler to trigger callback(s) on expiration.
- track entity identifiers in groups by creation date.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Config](#config)
  - [Singleton](#singleton)
  - [JsonAdapter](#jsonadapter)
  - [Watcher](#watcher)
  - [ScoreBoard](#scoreboard)
- [License](#license)

## Installation

```bash
npm install redis-extension --save
```

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

### JsonAdapter

```typescript
import {
    JsonAdapter,
    createClient
} from "redis-extension";

const client = createClient();

const jsonAdapter = new JsonAdapter(client);
await jsonAdapter.set('51f3509d-871b-48ad-af15-d1c9eb941362', {
    name: 'admin',
    // ...
});
const payload = jsonAdapter.get('51f3509d-871b-48ad-af15-d1c9eb941362');
console.log(payload);
// { name: 'admin', ... }
```

### Watcher

```typescript
import {
    Watcher,
    createClient
} from "redis-extension";

const client = createClient();
client.set('foo', 'bar', 'PX', '500');

const watcher = new Watcher(client, {
    prefix: 'user',
});

// Register events
watcher.on('expired', (data) => {
    console.log(data);
    // { id: 'foo', prefix: 'user' }

    // Important: The value will not be part of the expired event payload!
});

// Start scheduler to watch for expired cache entries
await watcher.start();
```

### ScoreBoard

```typescript
import {
    createClient,
    ScoreBoard,
} from "redis-extension";

const client = createClient();

const scoreBoard = new ScoreBoard(client, {
    key: 'users-online'
});

// add user with id: 1 to the stack (time: 1642423766)
scoreBoard.set(1);

// add user with id: 2 to the stack (time: 1642423866)
scoreBoard.set(2);

const items = scoreBoard.getMeta({
    sort: 'DESC'
});

console.log(items);
// {
//      data: [
//          {key: 1, score: 1642423766},
//          {key: 2, score: 1642423866}
//      ],
//      meta: {}
// }

```

The `score` property represents the unix timestamp, when the entry was added.

## License

Made with 💚

Published under [MIT License](./LICENSE).
