# Testing

`npm test` runs Vitest using `test/vitest.config.mts`. `npm run test:coverage` enables the configured coverage provider and existing thresholds; keep those thresholds and source inclusion rules intact.

Tests start a disposable Redis container and a single-node Redis Cluster container through `test/setup.js`; Docker access is required. The `JsonAdapter` and `ScoreBoard` specs run against both, through `test/utils/connections.ts`. Preserve key construction, connection configuration and watcher cleanup.

Run the build when changing exported types or bundle configuration. Validate both CommonJS and ESM consumer entrypoints when altering package exports. A missing external service is an incomplete check, not a passing test.
