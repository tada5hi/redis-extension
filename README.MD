<p align="center">
    <img src="./.github/assets/logo.svg" alt="redis-extension" width="128" height="128" />
</p>

<h1 align="center">redis-extension</h1>

<p align="center">
    <b>Key watchers, JSON values, scoreboards and key paths for ioredis, with clients shared by alias.</b><br>
    Stop wiring keyspace notifications, <code>JSON.parse</code> calls and sorted-set replies by hand:<br>
    pass your ioredis client to a helper and keep using it for everything else.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/redis-extension"><img src="https://badge.fury.io/js/redis-extension.svg" alt="npm version" /></a>
    <a href="https://github.com/tada5hi/redis-extension/actions/workflows/main.yml"><img src="https://github.com/tada5hi/redis-extension/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="https://codecov.io/gh/tada5hi/redis-extension"><img src="https://codecov.io/gh/tada5hi/redis-extension/branch/master/graph/badge.svg?token=0VL41WO0CG" alt="Coverage" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a>
    ·
    <a href="#usage">Usage</a>
    ·
    <a href="#options">Options</a>
    ·
    <a href="#api">API</a>
    ·
    <a href="#notes">Notes</a>
</p>

---

## Why redis-extension?

ioredis gives you every Redis command. The patterns built from those commands are left to you, so each project writes its own version of them. Reacting to a key that expires takes a server setting, a second connection and channel-name parsing. Storing an object takes `JSON.stringify` and a `try`/`catch` around `JSON.parse` at every call site. A leaderboard takes a flat `WITHSCORES` reply that has to be paired up.

redis-extension writes those patterns once, on top of the ioredis client you already have:

| Concern | With ioredis alone | With redis-extension |
|---|---|---|
| **React to key changes** | Set `notify-keyspace-events`, `duplicate()` a connection (a subscribed connection cannot run commands), `PSUBSCRIBE` the right channels, strip `__keyspace@0__:` from each channel name | `new Watcher(client, { pattern: 'user:*' })`, then `watcher.on('del', key => …)` |
| **Store objects** | `JSON.stringify` on write, `JSON.parse` in a `try`/`catch` on read, and the `SET` argument order for `PX`, `NX`, `XX` and `KEEPTTL` | `JsonAdapter.set(key, value, { seconds: 60, ifNotExists: true })`; `get()` resolves `undefined` for a missing or unparsable value |
| **Rank members by score** | `ZADD`, then `ZREVRANGEBYSCORE … WITHSCORES LIMIT`, pair up the flat reply, and a separate `ZCARD` for the total | `ScoreBoard.add(id)`, then `get({ limit: 10 })` returns `{ data: [{ id, score }], meta: { total } }` |
| **Share one connection** | A module-level singleton, or a client passed through every layer | `setConfig({ connectionString })` once, then `useClient()` anywhere; aliases for a second server |
| **Compound keys** | String concatenation, and a parser that has to agree with it | `buildKeyPath({ prefix, key, suffix })` and `parseKeyPath()`; `escapeKey()` for glob patterns |

The same delete listener, both ways:

```typescript
// ioredis alone
await client.config('SET', 'notify-keyspace-events', 'KA');
const subscriber = client.duplicate();
await subscriber.psubscribe('__keyspace@*__:session:*');
subscriber.on('pmessage', (_pattern, channel, event) => {
    if (event === 'del') {
        onDeleted(channel.slice(channel.indexOf('__:') + 3));
    }
});

// redis-extension
const watcher = new Watcher(client, { pattern: 'session:*' });
watcher.on('del', (key) => onDeleted(key));
await watcher.start();
```

A `Watcher` turns Redis keyspace notifications into Node.js events:

<p align="center">
    <img src="./.github/assets/watcher.svg" alt="watcher.start() sets notify-keyspace-events to KA on the Redis server and opens a duplicate connection that pattern-subscribes to __key*__:user:*. When the client runs SET user:1 with PX 300, Redis publishes set and expire on the channel __keyspace@0__:user:1, and expired 300 ms later. The Watcher emits each one as an event with the key user:1; keyevent channels are filtered out." width="100%" />
</p>

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Connections](#connections)
  - [Watcher](#watcher)
  - [JsonAdapter](#jsonadapter)
  - [ScoreBoard](#scoreboard)
  - [Key paths](#key-paths)
- [Options](#options)
- [API](#api)
- [Notes](#notes)
- [License](#license)

## Installation

```bash
npm install redis-extension --save
```

The package ships ES module and CommonJS builds with type declarations. It requires Node.js 24 or newer and depends on [ioredis](https://github.com/redis/ioredis) 6. The `Client` and `Cluster` it exports are the ioredis `Redis` and `Cluster` classes, so every ioredis command and option is available on them.

## Usage

### Connections

Register a configuration once, then fetch the client for it wherever you need it:

```typescript
import { setConfig, useClient } from 'redis-extension';

setConfig({
    connectionString: 'redis://127.0.0.1:6379',
});

const client = useClient();
await client.set('greeting', 'hello');
```

- `useClient(alias?)` creates the client from `useConfig(alias)` on the first call and returns the same instance afterwards. The alias defaults to `'default'`.
- `setConfig(value, alias?)` stores a configuration. Its `options` go to the ioredis client on top of the built-in defaults: `enableReadyCheck: true`, a retry strategy that keeps reconnecting with a backoff of `times * 50` ms (at most 2000 ms), and a reconnect on `ECONNRESET` errors. An option you pass wins over its default.
- `useConfig(alias?)` returns the configuration for that alias, or the built-in defaults for an alias that has none.
- `unsetClient(alias?)` disconnects the cached client and forgets it. `setClient(client, alias?)` registers a client you created yourself, and `hasClient(alias?)` checks for one. `hasConfig` and `unsetConfig` do the same for configurations.
- `createClient(config?)` builds a new, uncached client from `connectionString` and `options`. Without arguments it connects to `localhost:6379` with the ioredis defaults.

A second server lives under its own alias:

```typescript
import { setConfig, useClient } from 'redis-extension';

setConfig({ connectionString: 'redis://cache:6379/1' }, 'cache');

const cache = useClient('cache');
```

For Redis Cluster, `useCluster(alias?)`, `setCluster`, `hasCluster` and `createCluster(config?)` work the same way. The startup nodes come from `clusterNodes`; when that list is empty, `connectionString` is used as the only node. `clusterOptions` is passed to the ioredis `Cluster`.

```typescript
import { createCluster } from 'redis-extension';

const cluster = createCluster({
    clusterNodes: [
        { host: '10.0.0.1', port: 6379 },
        { host: '10.0.0.2', port: 6379 },
    ],
    clusterOptions: { scaleReads: 'slave' },
});
```

### Watcher

Watch keys that match a glob pattern and receive one event per change:

```typescript
import { Watcher, useClient } from 'redis-extension';

const client = useClient();

const watcher = new Watcher(client, {
    pattern: 'user:*',
});

watcher.on('set', (key) => {
    console.log('written', key); // user:1
});

watcher.on('del', (key) => {
    console.log('deleted', key);
});

watcher.on('error', (error) => {
    console.error(error);
});

await watcher.start();

await client.set('user:1', 'alice', 'PX', 500);
await client.del('user:1');

// later
await watcher.stop();
```

- `start()` runs `CONFIG SET notify-keyspace-events KA` on the server (see [`notifyKeyspaceEvents`](#watcher-options) to skip it), opens a duplicate connection with `client.duplicate()` and pattern-subscribes it to `__key*__:<pattern>` for every pattern. Calling it again while the watcher runs does nothing.
- The event name is the Redis notification: `set`, `del`, `expire` (a TTL was set), `expired` (the key was removed because its TTL ran out), `rename_from`, `hset`, `lpush`, `zadd` and so on. The listener receives the key. A `SET … PX 500` emits `set` and `expire`, then `expired` 500 ms later.
- `pattern` takes a glob or an array of globs (`h?llo`, `h*llo`, `h[ae]llo`) and defaults to every key. Only keyspace channels emit; keyevent channels are filtered out, so each change emits once. Pass a key through [`escapeKey()`](#key-paths) to watch it literally.
- Errors of the subscriber connection are re-emitted as `error`.
- `stop()` unsubscribes and disconnects the duplicate connection. The client you passed in stays open.

`on()` accepts the event names as strings or as members of the exported `WatcherEvent` enum:

```typescript
import { Watcher, WatcherEvent, useClient } from 'redis-extension';

const watcher = new Watcher(useClient(), { pattern: 'session:*' });

watcher.on(WatcherEvent.EXPIRED, (key) => {
    console.log('session ended', key);
});

await watcher.start();
```

On a server where `CONFIG` is blocked, as on many managed Redis services, enable keyspace notifications through the provider and pass `notifyKeyspaceEvents: false`:

```typescript
import { Watcher, useClient } from 'redis-extension';

const watcher = new Watcher(useClient(), {
    pattern: 'session:*',
    notifyKeyspaceEvents: false,
});
```

### JsonAdapter

Store values as JSON and read them back as objects:

```typescript
import { JsonAdapter, useClient } from 'redis-extension';

type User = { name: string, roles: string[] };

const adapter = new JsonAdapter(useClient());

await adapter.set('user:51f3509d', { name: 'admin', roles: ['owner'] }, {
    seconds: 3600,
});

const user = await adapter.get<User>('user:51f3509d');
// { name: 'admin', roles: ['owner'] }

await adapter.drop('user:51f3509d'); // true
```

- `set(key, value, options?)` writes `JSON.stringify(value)` with `SET` and resolves without a result, also when `ifExists` or `ifNotExists` skipped the write. The [set options](#jsonadapter-set-options) map to `PX`, `XX`, `NX` and `KEEPTTL`.
- `get<T>(key)` resolves the parsed value, or `undefined` when the key does not exist or its value is not valid JSON. It rejects when the command fails, for example on a connection error or a key of another type. `T` is not checked at runtime.
- `drop(key)` deletes the key and resolves `true` when a key was removed.

### ScoreBoard

Keep members ordered by a score, for example who was active most recently:

```typescript
import { ScoreBoard, useClient } from 'redis-extension';

const scoreBoard = new ScoreBoard(useClient(), { key: 'users-online' });

await scoreBoard.add('user:1');
await scoreBoard.add('user:2', Date.now() + 1000);

const output = await scoreBoard.get({ limit: 10 });
// {
//     data: [
//         { id: 'user:2', score: 1731320401000 },
//         { id: 'user:1', score: 1731320400000 },
//     ],
//     meta: { total: 2, limit: 10 },
// }

await scoreBoard.drop('user:1');
await scoreBoard.clear();
```

- The board is a sorted set stored under `key`, which defaults to `score-board`. Give each board its own key; boards with the same key share their members.
- `add(id, score?)` runs `ZADD`. Adding an existing id updates its score. The score defaults to `Date.now()`, the current unix timestamp in milliseconds.
- `get(options?)` returns members highest score first (`sort: 'DESC'`), or lowest first with `sort: 'ASC'`. `offset` and `limit` page through them, and `meta.total` counts all members. Ids come back as strings and scores as numbers.
- `drop(id)` removes one member; `clear()` deletes the whole board.

### Key paths

Build a key from a prefix, a key and a suffix, and split it again:

```typescript
import { buildKeyPath, escapeKey, parseKeyPath } from 'redis-extension';

const key = buildKeyPath({ prefix: 'tenant-1', key: 'user', suffix: '42' });
// 'tenant-1#p#user#s#42'

parseKeyPath(key);
// { prefix: 'tenant-1', key: 'user', suffix: '42' }

escapeKey('report[2024]*');
// 'report\\[2024\\]\\*'
```

- The separators are `#p#` after the prefix and `#s#` before the suffix (`KeyPathSeparator.PREFIX` and `.SUFFIX`). An empty prefix or suffix is left out together with its separator.
- `parseKeyPath()` removes all whitespace first, then splits at the first `#p#` and the last `#s#`. A key that contains whitespace does not round-trip.
- `escapeKey()` puts a backslash before `*`, `?`, `[`, `]` and `\`, so the key matches itself in a glob pattern such as `Watcher`'s `pattern` or `SCAN … MATCH`.

## Options

### Config

| Option | Type | Default | Description |
|---|---|---|---|
| `connectionString` | `string` | none | Redis URL, such as `redis://user:pass@host:6379/0`. Used as the only cluster node when `clusterNodes` is empty |
| `options` | `ClientOptions` (ioredis `RedisOptions`) | `enableReadyCheck`, `retryStrategy`, `reconnectOnError` (see [Connections](#connections)) | Passed to the ioredis client, on top of the defaults |
| `clusterNodes` | `ClusterNode[]` | `[]` | Startup nodes for `createCluster` and `useCluster` |
| `clusterOptions` | `ClusterOptions` | `{}` | Passed to the ioredis `Cluster` |

### Watcher options

| Option | Type | Default | Description |
|---|---|---|---|
| `pattern` | `string \| string[]` | every key | Glob pattern(s) for the keys to watch, as in [`PSUBSCRIBE`](https://redis.io/docs/latest/commands/psubscribe/) |
| `notifyKeyspaceEvents` | `string \| false` | `'KA'` | Written to the server's `notify-keyspace-events` setting by `start()`. It must contain `K` (keyspace channels) and the event classes to watch, such as `Kg$x`; without `K`, no event is emitted. `false` leaves the server setting alone, which then needs the same flags |

### JsonAdapter set options

| Option | Type | Default | Redis | Description |
|---|---|---|---|---|
| `seconds` | `number` | none | `PX` | Time to live in seconds |
| `milliseconds` | `number` | none | `PX` | Time to live in milliseconds; wins over `seconds` |
| `ifNotExists` | `boolean` | `false` | `NX` | Write only when the key does not exist |
| `ifExists` | `boolean` | `false` | `XX` | Write only when the key exists; wins over `ifNotExists` |
| `keepTTL` | `boolean` | `false` | `KEEPTTL` | Keep the key's current TTL; `seconds` and `milliseconds` are ignored |

### ScoreBoard options

| Option | Type | Default | Description |
|---|---|---|---|
| `key` | `string` | `'score-board'` | Key of the sorted set that holds the board |

### ScoreBoard get options

| Option | Type | Default | Description |
|---|---|---|---|
| `sort` | `'ASC' \| 'DESC'` | `'DESC'` | Lowest or highest score first |
| `limit` | `number` | all members | Members to return |
| `offset` | `number` | `0` | Members to skip; only applied together with `limit` |

## API

| Export | Kind | Purpose |
|---|---|---|
| `setConfig`, `useConfig`, `hasConfig`, `unsetConfig` | function | Store and read a `Config` per alias |
| `buildConfig`, `buildConfigWithDefaults` | function | Fill in a `Config` from a `ConfigInput`, without or with the built-in client defaults |
| `useClient`, `setClient`, `hasClient`, `unsetClient` | function | Cached ioredis client per alias |
| `createClient` | function | New, uncached client from a `ConfigInput` |
| `useCluster`, `setCluster`, `hasCluster` | function | Cached ioredis cluster per alias |
| `createCluster` | function | New, uncached cluster from a `ConfigInput` |
| `Client`, `Cluster` | class | The ioredis `Redis` and `Cluster` classes |
| `Watcher` | class | `EventEmitter` for keyspace notifications of matching keys |
| `WatcherEvent` | enum | Event names a `Watcher` emits, such as `SET = 'set'` and `EXPIRED = 'expired'` |
| `JsonAdapter` | class | `set`, `get` and `drop` of JSON values |
| `ScoreBoard` | class | `add`, `get`, `drop` and `clear` on a sorted set |
| `buildKeyPath`, `parseKeyPath` | function | Join and split `prefix#p#key#s#suffix` |
| `escapeKey` | function | Escape glob characters in a key |
| `KeyPathSeparator` | enum | `PREFIX = '#p#'`, `SUFFIX = '#s#'` |
| `Config`, `ConfigInput`, `ClientOptions`, `ClusterOptions`, `ClusterNode` | type | Connection configuration |
| `WatcherOptions`, `JSONAdapterSetOptions`, `KeyPath` | type | Options and values of the helpers above |
| `ScoreBoardOptions`, `ScoreBoardOptionsInput`, `ScoreBoardGetOptions`, `ScoreBoardGetOutput`, `ScoreBoardItem` | type | ScoreBoard options and results |

## Notes

- **`Watcher.start()` changes server configuration.** It sets `notify-keyspace-events` to `KA` for the whole server, which makes Redis publish a message for every write by every client. `stop()` does not restore the previous value. On services that block the `CONFIG` command, enable notifications through the provider and pass `notifyKeyspaceEvents: false`; otherwise `start()` rejects.
- **Watcher events are delivered at most once.** Keyspace notifications are Redis pub/sub: changes made before `start()`, while the duplicate connection reconnects or after `stop()` emit nothing, and they are not replayed.
- **`expired` is not `expire`.** `expire` fires when a TTL is set (including `SET … PX`); `expired` fires when Redis removes the key. Redis removes expired keys lazily or in a background cycle, so `expired` can arrive after the TTL has run out.
- **Listen for `error`.** The watcher re-emits connection errors as `error`; without a listener, Node.js throws them.
- **`Watcher` takes a `Redis` client.** It does not accept a `Cluster`.
- **`JsonAdapter.get()` does not tell a missing key from invalid JSON.** Both resolve `undefined`; read the raw value with the client when you need to know which.
- **The default retry strategy never gives up, but queued commands do.** The client keeps reconnecting, while ioredis rejects a queued command after `maxRetriesPerRequest` reconnection attempts (20 by default). Set `maxRetriesPerRequest: null` in `options` to let commands wait until the connection is back, or pass your own `retryStrategy` (return `null` to stop reconnecting).

## License

Made with 💚

Published under [MIT License](./LICENSE).
