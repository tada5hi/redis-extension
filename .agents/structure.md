# Project Structure

| Source | Responsibility |
|---|---|
| `src/driver` | Connection creation (`createClient`, `createCluster`) and ioredis re-exports |
| `src/key` | Redis key construction |
| `src/value-store` | Typed value storage, JSON by default |
| `src/score-board and src/watcher` | Scores and event watching |
| `src/index.ts` | Public package exports |
| `tsdown.config.mts` | JavaScript build configuration |

The package exports map declares the package root, `./package.json`. Use these declared entrypoints under exports-aware resolution; undeclared `dist/` paths are not additional public exports. Preserve the declared output paths. `types.ts` files own shared type declarations. The package keeps no module-level connection state; callers own each client's lifetime.

The build runs tsdown and refreshes declarations through `build:types` after successful JavaScript builds. Generated `dist/` files are build artifacts.
