# Project Structure

| Source | Responsibility |
|---|---|
| `src/config and src/driver` | Connection configuration and driver integration |
| `src/key` | Redis key construction |
| `src/json-adapter` | JSON storage behavior |
| `src/score-board and src/watcher` | Scores and event watching |
| `src/index.ts` | Public package exports |
| `tsdown.config.mts` | JavaScript build configuration |

The package exposes CommonJS, ESM and TypeScript declarations through `package.json`. Preserve the declared `dist/` paths and any public deep type imports. `types.ts` owns shared type declarations; compatibility facades retain public import paths.

The build runs tsdown and refreshes declarations through `build:types` after successful JavaScript builds. Generated `dist/` files are build artifacts.
