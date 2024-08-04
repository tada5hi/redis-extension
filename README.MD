# Redis Extension 🍬

[![npm version](https://badge.fury.io/js/redis-extension.svg)](https://badge.fury.io/js/redis-extension)
[![main](https://github.com/tada5hi/redis-extension/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/redis-extension/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/tada5hi/redis-extension/branch/master/graph/badge.svg?token=0VL41WO0CG)](https://codecov.io/gh/tada5hi/redis-extension)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

This a library, which provides additional [features](#features) to the
redis client library.

**Table of Contents**

- [Installation](#installation)
- [Features](#features)
- [Usage](#usage)
  - [Watcher](#watcher)
  - [ScoreBoard](#scoreboard)
  - [JsonAdapter](#jsonadapter)
- [License](#license)

## Installation

```bash
npm install redis-extension --save
```

## Features

- ️‍️🕵️‍♀️ **Watcher** - Watch for specific events
- 🏆 **ScoreBoard** - Store keys by score.
- 🔌 **JsonAdapter** - Stringify value as json string on set and parse on get

## Usage

### Watcher

```typescript
import {
    Watcher,
    createClient
} from "redis-extension";

const client = createClient();
client.set('foo', 'bar', 'PX', '500');

const watcher = new Watcher(client, {
    pattern: 'foo*',
});

// Register events
watcher.on('expire', (key) => {
    console.log(key);
    // foo
});

// Start watching
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
scoreBoard.add(1);

// add user with id: 2 to the stack (time: 1642423866)
scoreBoard.add(2);

const output = scoreBoard.get({
    sort: 'DESC'
});

console.log(output);
// {
//      data: [
//          {id: 1, score: 1642423766},
//          {id: 2, score: 1642423866}
//      ],
//      meta: {
//          total: 2
//      }
// }
```

The `score` property represents the unix timestamp by default if it has not been set otherwise.

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

## License

Made with 💚

Published under [MIT License](./LICENSE).
