# Time Tracker

Electron + React + TypeScript desktop application for time tracking and productivity analytics. See [ARCHITECTURE.md](ARCHITECTURE.md) for the design and [docs/AUTO_LAUNCH.md](docs/AUTO_LAUNCH.md) for auto-launch behavior.

## Install and verify without running the desktop app

Headless checks have been verified with Node.js 24.13.1 and npm 11.8.0. Install development dependencies explicitly, including when `NODE_ENV=production` is set:

```sh
npm ci --include=dev --ignore-scripts
npm run typecheck
npm run build
npm run test:app
npm test
```

`--ignore-scripts` intentionally skips Electron's binary download and native-addon installation. It is sufficient for the typechecks, renderer/Electron compilation and synthetic tests above; it does **not** prepare a runnable desktop installation.

- `build:renderer`: strict renderer typecheck and Vite production assets in `dist/`.
- `build:electron`: strict Electron TypeScript compilation to `dist-electron/`.
- `build`: both builds, without an installer or app launch.
- `test:app`: manifest/lockfile checks and local-file protocol tests. Electron, file lookup and fetch are replaced with inert synthetic doubles; no tracking, screenshots or user database access occurs.
- `test:legacy`: the existing Jest tests, unchanged.
- `test`: both test groups; a failure in either returns a nonzero exit code.

### Known legacy test failure

`test/parser.test.js` imports `../src/parser`, which is absent from the repository. That suite fails to load; the other five legacy suites currently pass (20 tests). This is not suppressed or excluded from `npm test`. The scanner/CLI backfill modules and tests have been retained.

## Interactive development and packaging

These commands intentionally launch desktop functionality; do not use them for headless verification. Complete Electron's install script and rebuild native modules for the selected Electron ABI in a development environment before running the app.

```sh
npm run build:electron
npm run electron:dev
```

`electron:dev` retains the historical concurrent Vite/TypeScript/Electron workflow. The initial build above ensures the main entry exists. It may still need a retry if Electron starts before Vite is ready. `npm start` launches Electron alone and expects the Vite server to be running while the app is unpackaged.

```sh
npm run electron:build
```

`electron:build` compiles and invokes the existing electron-builder configuration. Installer packaging, native-addon ABI compatibility, signing and interactive behavior are not covered by the synthetic verification. The existing builder configuration disables automatic native rebuilds; successful TypeScript compilation does not prove a packaged app will run.

## Manifest provenance

The application dependency ranges and Electron entry point are restored from commit `ab0303bdf6e0c24aee3e98310582580187c8fb29`; its dependencies match the original lockfile root exactly. Version `0.2.0` is retained rather than reverting to the historical `0.1.0`. Jest is retained for the existing test suite. Unconfigured scanner-only ESLint/Prettier commands are not used as application quality checks.

The `local-file` protocol only serves files below the screenshot directory, checks both lexical and canonical paths, and uses encoded file URLs. This limits file access; it is not a complete audit of all renderer/IPC capabilities.
