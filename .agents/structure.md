# Project Structure

| Source | Responsibility |
|---|---|
| `src/config and src/driver` | Connection configuration and driver integration |
| `src/key` | Redis key construction |
| `src/json-adapter` | JSON storage behavior |
| `src/score-board and src/watcher` | Scores and event watching |
| `src/index.ts` | Public package exports |
| `tsdown.config.mts` | JavaScript build configuration |

The package exports map declares the package root, `./package.json`. Use these declared entrypoints under exports-aware resolution; undeclared `dist/` paths are not additional public exports. Preserve the declared output paths. `types.ts` files own shared type declarations; filesystem declaration paths and facades provide legacy compatibility only where the resolver supports them.

The build runs tsdown and refreshes declarations through `build:types` after successful JavaScript builds. Generated `dist/` files are build artifacts.
