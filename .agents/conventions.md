# Conventions

Use the installed shared ESLint configuration through the repository's lint command. Keep interface/type naming and declaration placement compatible with public exports; qualify filesystem/deep type compatibility against the declared exports map.

Tests start a disposable Redis container and a three-master Redis Cluster container through `test/setup.js`; Docker access is required. The `JsonAdapter` and `ScoreBoard` specs run against both through `test/utils/connections.ts`, and the `Watcher` spec covers the cluster. Preserve key construction, connection configuration and watcher cleanup.

Keep the runtime engine and emitted JavaScript contract separate from tooling requirements. Bundler upgrades must retain output names, module formats, declaration generation and source-map behavior. Avoid introducing runtime APIs unsupported by the package's declared engine or documented consumers.

No dependency overrides are declared. For any compatibility pin introduced during future work, record its reason and the condition for removing it here.

Release configuration lives in `.github/workflows/` and the release-please files. Changes to release triggers must preserve the separation between creating release metadata and publishing artifacts.
