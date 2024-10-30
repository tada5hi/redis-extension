## [2.0.1](https://github.com/tada5hi/redis-extension/compare/v2.0.0...v2.0.1) (2024-10-30)


### Bug Fixes

* add missing return statement in json adapter ([9e12b35](https://github.com/tada5hi/redis-extension/commit/9e12b3589cb24716ecbabdf5d613b69961265eb6))

# [2.0.0](https://github.com/tada5hi/redis-extension/compare/v1.3.0...v2.0.0) (2024-08-04)


### Bug Fixes

* **deps:** bump ioredis from 5.3.1 to 5.4.0 ([#243](https://github.com/tada5hi/redis-extension/issues/243)) ([3d41f5f](https://github.com/tada5hi/redis-extension/commit/3d41f5fb0a261b0b8a9b01deab211d2e0f3fafbe))
* **deps:** bump ioredis from 5.4.0 to 5.4.1 ([#247](https://github.com/tada5hi/redis-extension/issues/247)) ([956f26a](https://github.com/tada5hi/redis-extension/commit/956f26a36976e1314eb4bf2bf9473aecaee058b0))
* **deps:** bump smob from 1.0.0 to 1.5.0 ([#232](https://github.com/tada5hi/redis-extension/issues/232)) ([841045a](https://github.com/tada5hi/redis-extension/commit/841045a3e057bbfdf21ec2ef00948ab3e3a178ab))
* do not parse key in watcher + renamed key sub module ([6ee772e](https://github.com/tada5hi/redis-extension/commit/6ee772e0c2611793d29c9ab4bffdc3ac729ca1df))


### Features

* add typings for watcher events & support multiple pattern ([#309](https://github.com/tada5hi/redis-extension/issues/309)) ([b3362e0](https://github.com/tada5hi/redis-extension/commit/b3362e015bcf69063f0ce2ee55415e4f8e8ead1f))
* cleanup score board modul and updated README.md ([9c6d302](https://github.com/tada5hi/redis-extension/commit/9c6d3028d90a9f5a3af8c943d3ab12209537304b))
* don't use default export for client creation as well ([6d68d1a](https://github.com/tada5hi/redis-extension/commit/6d68d1adc3341138153025218421390bfe4b1c9c))
* don't use default export for cluster creation ([84d0744](https://github.com/tada5hi/redis-extension/commit/84d0744e6e3c38c83eca3b914abd0132e46882f0))
* implemented json adapter ([#308](https://github.com/tada5hi/redis-extension/issues/308)) ([d7ebab2](https://github.com/tada5hi/redis-extension/commit/d7ebab2d8ffe1535bd161be6891ea8f0f7a820cd))
* refactor whole library ([#306](https://github.com/tada5hi/redis-extension/issues/306)) ([e2f8244](https://github.com/tada5hi/redis-extension/commit/e2f824461152821bb6e234130cdf51dcb68642ff))


### BREAKING CHANGES

* removed set,get & drop methods from watcher
* public api changed

* chore: adjusted eslint

* feat: renamed tracker & cache

* chore: reset lock file

# [1.5.0](https://github.com/tada5hi/redis-extension/compare/v1.4.0...v1.5.0) (2024-04-17)


### Features

* don't use default export for client creation as well ([3a2a194](https://github.com/tada5hi/redis-extension/commit/3a2a194878f5367a1fde365643166ec9f37121e1))

# [1.4.0](https://github.com/tada5hi/redis-extension/compare/v1.3.1...v1.4.0) (2024-04-17)


### Features

* don't use default export for cluster creation ([fb77bb3](https://github.com/tada5hi/redis-extension/commit/fb77bb3881f07ed051d15c5d97ac174eab5a3fcb))

## [1.3.1](https://github.com/tada5hi/redis-extension/compare/v1.3.0...v1.3.1) (2024-04-17)


### Bug Fixes

* **deps:** bump ioredis from 5.3.1 to 5.4.0 ([#243](https://github.com/tada5hi/redis-extension/issues/243)) ([3d41f5f](https://github.com/tada5hi/redis-extension/commit/3d41f5fb0a261b0b8a9b01deab211d2e0f3fafbe))
* **deps:** bump smob from 1.0.0 to 1.5.0 ([#232](https://github.com/tada5hi/redis-extension/issues/232)) ([841045a](https://github.com/tada5hi/redis-extension/commit/841045a3e057bbfdf21ec2ef00948ab3e3a178ab))

## v1.3.0

[compare changes](https://github.com/tada5hi/redis-extension/compare/v1.2.4...v1.3.0)


### 🚀 Enhancements

  - Enhance config management + adjusted test suite ([22c3913](https://github.com/tada5hi/redis-extension/commit/22c3913))

### 🩹 Fixes

  - Adjusted correct client creation Ã+ updated dev deps ([4c54a37](https://github.com/tada5hi/redis-extension/commit/4c54a37))
  - **deps:** Bump smob to v1.x ([47c47f9](https://github.com/tada5hi/redis-extension/commit/47c47f9))

### 📦 Build

  - Simplified commitlint configuration + extend base tsconfig ([6934251](https://github.com/tada5hi/redis-extension/commit/6934251))
  - Use changelogen instead of semantic-release ([91edf19](https://github.com/tada5hi/redis-extension/commit/91edf19))

### 🎨 Styles

  - Fix consistent type imports ([753f94a](https://github.com/tada5hi/redis-extension/commit/753f94a))

### ❤️  Contributors

- Tada5hi <peter.placzek1996@gmail.com>

## [1.2.4](https://github.com/Tada5hi/redis-extension/compare/v1.2.3...v1.2.4) (2023-03-30)


### Bug Fixes

* **deps:** bump ioredis from 5.3.0 to 5.3.1 ([#205](https://github.com/Tada5hi/redis-extension/issues/205)) ([5573bea](https://github.com/Tada5hi/redis-extension/commit/5573bea6214455ab23e8ed81637aca0d2656fbd6))

## [1.2.3](https://github.com/Tada5hi/redis-extension/compare/v1.2.2...v1.2.3) (2023-02-02)


### Bug Fixes

* **deps:** bump smob from 0.0.7 to 0.1.0 ([#192](https://github.com/Tada5hi/redis-extension/issues/192)) ([8546d38](https://github.com/Tada5hi/redis-extension/commit/8546d381f5328eb84d2288eef8f11e2a4031d814))

## [1.2.2](https://github.com/Tada5hi/redis-extension/compare/v1.2.1...v1.2.2) (2023-01-28)


### Bug Fixes

* **deps:** bump ioredis from 5.2.4 to 5.3.0 ([#190](https://github.com/Tada5hi/redis-extension/issues/190)) ([4462729](https://github.com/Tada5hi/redis-extension/commit/4462729802cea0b351442ced3e85ec05a51f18a4))

## [1.2.1](https://github.com/Tada5hi/redis-extension/compare/v1.2.0...v1.2.1) (2023-01-24)


### Bug Fixes

* **deps:** bump node-schedule from 2.1.0 to 2.1.1 ([#179](https://github.com/Tada5hi/redis-extension/issues/179)) ([f5216de](https://github.com/Tada5hi/redis-extension/commit/f5216de987739961e05b3718bbd9589c169d711d))
* **deps:** bump smob from 0.0.6 to 0.0.7 ([#182](https://github.com/Tada5hi/redis-extension/issues/182)) ([995a0dc](https://github.com/Tada5hi/redis-extension/commit/995a0dccd0b0b1dab60d1482169b897da199fd00))

# [1.2.0](https://github.com/Tada5hi/redis-extension/compare/v1.1.1...v1.2.0) (2022-11-12)


### Features

* updated ioredis to v5 & other dependencies ([5ead61d](https://github.com/Tada5hi/redis-extension/commit/5ead61d6b4943a6edf42d7e308ef5f0e126315f9))
