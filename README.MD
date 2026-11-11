<p align="center">
    <img src="./.github/assets/logo.svg" alt="redis-extension" width="128" height="128" />
</p>

<h1 align="center">redis-extension</h1>

<p align="center">
    <b>Key watchers, typed values, scoreboards and key paths for ioredis clients and clusters.</b><br>
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
| **Store objects** | `JSON.stringify` on write, `JSON.parse` in a `try`/`catch` on read, the `SET` argument order for `PX`, `NX`, `XX` and `KEEPTTL`, and a read-compute-write for caching | `ValueStore.set(key, value, { seconds: 60, ifNotExists: true })`; `get()` resolves `undefined` for a missing or unparsable value; `getOrSet(key, factory)` caches |
| **Rank members by score** | `ZADD`, then `ZREVRANGEBYSCORE … WITHSCORES LIMIT`, pair up the flat reply, a separate `ZCARD` for the total, and `ZREMRANGEBYSCORE` to expire old members | `ScoreBoard.add(id)`, `get({ limit: 10 })` returns `{ data: [{ id, score }], meta: { total } }`, and `prune(below)` drops stale members |
| **Single node or cluster** | Helpers written against `Redis`, or a second code path for `Cluster` | `ValueStore` and `ScoreBoard` take either; `createClient()` adds reconnect defaults |
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
    <img src="./.github/assets/watcher.svg" alt="watcher.start() sets notify-keyspace-events to KA on the Redis server and opens a duplicate connection that pattern-subscribes to __keyspace@0__:user:*, the keyspace channel of the client database. When the client runs SET user:1 with PX 300, Redis publishes set and expire on the channel __keyspace@0__:user:1, and expired 300 ms later. The Watcher emits each one as an event with the key user:1." width="100%" />
</p>

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Connections](#connections)
  - [Watcher](#watcher)
  - [ValueStore](#valuestore)
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

Create a client with the package defaults and hand it to the helpers. How your application shares it, in a module variable or a dependency injection container, is up to you:

```typescript
import { ValueStore, createClient } from 'redis-extension';

const client = createClient({
    url: 'redis://127.0.0.1:6379',
});

const store = new ValueStore(client);
await store.set('greeting', { text: 'hello' });
```

- `createClient(input?)` opens a new ioredis `Redis` connection on every call. Its `options` go to ioredis on top of the defaults: `enableReadyCheck: true`, a retry strategy that keeps reconnecting with a backoff of `times * 50` ms (at most 2000 ms), and a reconnect on `ECONNRESET` errors. An option you pass wins over its default, except that a database in the `url` path (`redis://host:6379/2`) wins over `options.db`. Without a `url` it connects to `localhost:6379`.
- `createCluster(input)` opens a new ioredis `Cluster` from the startup `nodes`. Its `options` are passed to ioredis as they are; the client defaults do not apply.
- Close a connection with `disconnect()` or `quit()` when you no longer need it.

`Watcher`, `ValueStore` and `ScoreBoard` accept a client or a cluster:

```typescript
import { ScoreBoard, createCluster } from 'redis-extension';

const cluster = createCluster({
    nodes: [
        { host: '10.0.0.1', port: 6379 },
        { host: '10.0.0.2', port: 6379 },
    ],
    options: { scaleReads: 'slave' },
});

const scoreBoard = new ScoreBoard(cluster, { key: 'users-online' });
```

### Watcher

Watch keys that match a glob pattern and receive one event per change:

```typescript
import { Watcher, createClient } from 'redis-extension';

const client = createClient();

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

- `start()` runs `CONFIG SET notify-keyspace-events KA` on the server (see [`notifyKeyspaceEvents`](#watcher-options) to skip it) and pattern-subscribes to `__keyspace@<db>__:<pattern>` for every pattern, where `<db>` is the client's database. Calls while the watcher starts or runs share that start.
- Each watcher opens its own subscriber connection with `client.duplicate()` on `start()`, one per master on a cluster, and closes it on `stop()`. To watch several patterns over one connection, pass them as an array to one watcher.
- The event name is the Redis notification: `set`, `del`, `expire` (a TTL was set), `expired` (the key was removed because its TTL ran out), `rename_from`, `hset`, `lpush`, `zadd` and so on. The listener receives the key. A `SET … PX 500` emits `set` and `expire`, then `expired` 500 ms later.
- `pattern` takes a glob or an array of globs (`h?llo`, `h*llo`, `h[ae]llo`) and defaults to every key of the client's database. A change emits once per pattern it matches, so overlapping patterns emit it more than once. Pass a key through [`escapeKey()`](#key-paths) to watch it literally. With an ioredis `keyPrefix` on the client, patterns match keys below that prefix, and listeners receive keys without it, as you pass them to the client.
- Errors of the subscriber connection are re-emitted as `error` on the watcher.
- `stop()` unsubscribes the watcher's patterns and closes its subscriber connection. The client you passed in stays open.
- On a cluster, each master publishes the notifications of its own keys, so `start()` waits until the cluster is ready, through reconnect errors, and subscribes on every master; it rejects when the cluster is closed before it gets ready. Subscriber connections to cluster nodes reconnect on their own and restore their subscriptions. Masters that join later, for example after resharding, are watched from the next `start()` on.

A watcher is also an async disposable, so `await using` stops it at the end of the block:

```typescript
import { Watcher, createClient } from 'redis-extension';

const client = createClient();

{
    await using watcher = new Watcher(client, { pattern: 'job:*' });
    watcher.on('del', (key) => console.log('done', key));
    await watcher.start();

    await client.del('job:1');
}
// the watcher is stopped here
```

`on()` accepts the event names as strings or as members of the exported `WatcherEvent` enum:

```typescript
import { Watcher, WatcherEvent, createClient } from 'redis-extension';

const client = createClient();
const watcher = new Watcher(client, { pattern: 'session:*' });

watcher.on(WatcherEvent.EXPIRED, (key) => {
    console.log('session ended', key);
});

await watcher.start();
```

On a server where `CONFIG` is blocked, as on many managed Redis services, enable keyspace notifications through the provider and pass `notifyKeyspaceEvents: false`:

```typescript
import { Watcher, createClient } from 'redis-extension';

const client = createClient();
const watcher = new Watcher(client, {
    pattern: 'session:*',
    notifyKeyspaceEvents: false,
});
```

### ValueStore

Store typed values under keys, as JSON by default, and read them back:

```typescript
import { ValueStore, createClient } from 'redis-extension';

type User = { name: string, roles: string[] };

const client = createClient();
const store = new ValueStore<User>(client);

await store.set('user:51f3509d', { name: 'admin', roles: ['owner'] }, {
    seconds: 3600,
});

const user = await store.get('user:51f3509d');
// { name: 'admin', roles: ['owner'] }

await store.drop('user:51f3509d'); // true
```

- `set(key, value, options?)` writes the serialized value with `SET`. It resolves `true` when the value was written and `false` when `ifExists` or `ifNotExists` skipped the write, and rejects with a `TypeError` for a value `serialize` turns into no string, such as `undefined` or a function under `JSON.stringify`. The [set options](#valuestore-set-options) map to `PX` (rounded to whole milliseconds), `XX`, `NX` and `KEEPTTL`.
- `get(key)` resolves the value as the store's type `T`, or `undefined` when the key does not exist or `deserialize` throws or rejects for its value. It rejects when the command fails, for example on a connection error or a key of another type.
- `getMany(keys)` resolves the values in the order of the keys, with `undefined` where `get()` would resolve `undefined`, and rejects where `get()` rejects, such as for a key of another type. It sends one `GET` per key, all at once, so the keys can live on different cluster nodes.
- `setMany(entries, options?)` writes a record or a list of `[key, value]` pairs concurrently with the same options and resolves one `set()` result per entry. The writes are not atomic.
- `getOrSet(key, factory, options?)` resolves the stored value, or calls `factory`, stores its result with `options` and resolves it.
- `drop(key)` deletes the key and resolves `true` when a key was removed.

Cache a computed value, and check what comes back with `deserialize`. The type parameter alone is not checked at runtime:

```typescript
import { ValueStore, createClient } from 'redis-extension';

type Report = { total: number };
declare function buildReport(): Promise<Report>;

const client = createClient();
const reports = new ValueStore<Report>(client, {
    deserialize: (text) => {
        const value = JSON.parse(text);

        if (typeof value?.total !== 'number') {
            throw new TypeError('not a report');
        }

        return value;
    },
});

const report = await reports.getOrSet('report:today', () => buildReport(), {
    seconds: 300,
});
```

A value that `deserialize` rejects reads as `undefined`, so `getOrSet` replaces it. Two callers that miss at the same time both run the factory and the last write wins; pass `ifNotExists: true` to keep the first write, and both callers then resolve the stored value. With `ifNotExists`, an unreadable value is still replaced, unless another caller stored a readable one first.

Plain JSON turns `Date`, `Map` and `BigInt` values into strings, objects or errors. Pass your own `serialize`, `deserialize` or both to keep them, or to store another format such as superjson or encrypted text. Either may return a Promise, for example to decrypt or to run an async schema check:

```typescript
import { ValueStore, createClient } from 'redis-extension';

const client = createClient();
const events = new ValueStore<{ at: Date }>(client, {
    deserialize: (text) => JSON.parse(text, (key, value) => (key === 'at' ? new Date(value) : value)),
});
```

### ScoreBoard

Keep members ordered by a score, for example who was active most recently:

```typescript
import { ScoreBoard, createClient } from 'redis-extension';

const client = createClient();
const scoreBoard = new ScoreBoard(client, { key: 'users-online' });

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

await scoreBoard.rank('user:1'); // 1
await scoreBoard.score('user:1'); // 1731320400000

// forget users who were not active in the last minute
await scoreBoard.prune(Date.now() - 60_000);
```

Counting works the same way, with `increment()` instead of timestamps:

```typescript
import { ScoreBoard, createClient } from 'redis-extension';

const client = createClient();
const leaderboard = new ScoreBoard(client, { key: 'leaderboard' });

await leaderboard.increment('alice', 10); // 10
await leaderboard.increment('alice'); // 11
```

- The board is a sorted set stored under `key`, which defaults to `score-board`. Give each board its own key; boards with the same key share their members.
- `add(id, score?)` runs `ZADD`. Adding an existing id updates its score. The score defaults to `Date.now()`, the current unix timestamp in milliseconds.
- `get(options?)` returns members highest score first (`sort: 'DESC'`), or lowest first with `sort: 'ASC'`. `offset` skips members and `limit` caps how many come back, and `meta.total` counts all members. Ids come back as strings and scores as numbers. `meta.limit` and `meta.offset` are set when you pass them. The page and the total are read in one `MULTI`, so `total` matches `data` while other clients write; a `WATCH` you hold on the same connection aborts that `MULTI`, and `get()` rejects. Scores of `Infinity` and `-Infinity` round-trip.
- `score(id)` resolves the score of a member, `rank(id, sort?)` its zero-based position (highest score first by default). Both resolve `undefined` for an unknown member.
- `increment(id, by?)` adds `by` (default `1`) to the score with `ZINCRBY` and resolves the new score; an unknown member starts at `0`.
- `prune(below)` removes every member with a score lower than `below` and resolves how many it removed.
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
- `parseKeyPath()` splits at the first `#p#` and the last `#s#`, so a path built with `buildKeyPath()` parses back to the same parts, unless a part itself contains `#p#` or `#s#`.
- `escapeKey()` puts a backslash before `*`, `?`, `[`, `]` and `\`, so the key matches itself in a glob pattern such as `Watcher`'s `pattern` or `SCAN … MATCH`.

## Options

### createClient input

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | `localhost:6379` | Redis URL, such as `redis://user:pass@host:6379/0` |
| `options` | `ClientOptions` (ioredis `RedisOptions`) | `enableReadyCheck`, `retryStrategy`, `reconnectOnError` (see [Connections](#connections)) | Passed to ioredis on top of the defaults |

### createCluster input

| Option | Type | Default | Description |
|---|---|---|---|
| `nodes` | `ClusterNode[]` | required | Startup nodes, as `{ host, port }` objects or URLs |
| `options` | `ClusterOptions` | `{}` | Passed to the ioredis `Cluster` as they are |

### Watcher options

| Option | Type | Default | Description |
|---|---|---|---|
| `pattern` | `string \| string[]` | every key | Glob pattern(s) for the keys to watch, as in [`PSUBSCRIBE`](https://redis.io/docs/latest/commands/psubscribe/) |
| `notifyKeyspaceEvents` | `string \| false` | `'KA'` | Written to the server's `notify-keyspace-events` setting by `start()`. It must contain `K` (keyspace channels) and the event classes to watch, such as `Kg$x`; without `K`, no event is emitted. `false` leaves the server setting alone, which then needs the same flags |

### ValueStore options

| Option | Type | Default | Description |
|---|---|---|---|
| `serialize` | `(value: T) => string \| Promise<string>` | `JSON.stringify` | Turns a value into the stored text; a result that is no string makes `set()` reject with a `TypeError` |
| `deserialize` | `(text: string) => T \| Promise<T>` | `JSON.parse` | Turns the stored text into a value, e.g. to validate it or revive `Date` values; a throw or rejection reads as `undefined` |

### ValueStore set options

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
| `offset` | `number` | `0` | Members to skip |

## API

| Export | Kind | Purpose |
|---|---|---|
| `createClient` | function | New ioredis client from a `ClientInput`, with the default options |
| `createCluster` | function | New ioredis cluster from a `ClusterInput` |
| `Client`, `Cluster` | class | The ioredis `Redis` and `Cluster` classes |
| `Watcher` | class | `EventEmitter` for keyspace notifications of matching keys, on a client or a cluster |
| `WatcherEvent` | enum | Event names a `Watcher` emits, such as `SET = 'set'` and `EXPIRED = 'expired'` |
| `ValueStore` | class | `get`, `set`, `getMany`, `setMany`, `getOrSet` and `drop` of typed values, JSON by default, on a client or a cluster |
| `ScoreBoard` | class | `add`, `get`, `score`, `rank`, `increment`, `prune`, `drop` and `clear` on a sorted set, on a client or a cluster |
| `buildKeyPath`, `parseKeyPath` | function | Join and split `prefix#p#key#s#suffix` |
| `escapeKey` | function | Escape glob characters in a key |
| `KeyPathSeparator` | enum | `PREFIX = '#p#'`, `SUFFIX = '#s#'` |
| `ClientInput`, `ClusterInput`, `ClientOptions`, `ClusterOptions`, `ClusterNode` | type | Connection configuration |
| `WatcherOptions`, `ValueStoreOptions`, `ValueStoreSetOptions`, `KeyPath` | type | Options and values of the helpers above |
| `ScoreBoardOptions`, `ScoreBoardOptionsInput`, `ScoreBoardGetOptions`, `ScoreBoardGetOutput`, `ScoreBoardItem` | type | ScoreBoard options and results |

## Notes

- **`Watcher.start()` changes server configuration.** It sets `notify-keyspace-events` to `KA` for the whole server, which makes Redis publish a message for every write by every client. `stop()` does not restore the previous value. On services that block the `CONFIG` command, enable notifications through the provider and pass `notifyKeyspaceEvents: false`; otherwise `start()` rejects.
- **Watcher events are delivered at most once.** Keyspace notifications are Redis pub/sub: changes made before `start()`, while the duplicate connection reconnects or after `stop()` emit nothing, and they are not replayed.
- **`expired` is not `expire`.** `expire` fires when a TTL is set (including `SET … PX`); `expired` fires when Redis removes the key. Redis removes expired keys lazily or in a background cycle, so `expired` can arrive after the TTL has run out.
- **Listen for `error`.** The watcher re-emits connection errors as `error`; without a listener, Node.js throws them.
- **A cluster watcher covers the masters known at `start()`.** Restart the watcher after adding masters to the cluster.
- **`ValueStore.get()` does not tell a missing key from an unreadable value.** Both resolve `undefined`; read the raw value with the client when you need to know which.
- **The default retry strategy never gives up, but queued commands do.** The client keeps reconnecting, while ioredis rejects a queued command after `maxRetriesPerRequest` reconnection attempts (20 by default). Set `maxRetriesPerRequest: null` in `options` to let commands wait until the connection is back, or pass your own `retryStrategy` (return `null` to stop reconnecting).

## License

Made with 💚

Published under [MIT License](./LICENSE).
