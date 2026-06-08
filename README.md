# project-dokuha

Static GitHub Pages app shell for Project DOKUHA.

## Local Flow

```bash
npm install
npm run dev
npm run check
npm run build
npm run preview
```

## Local ST Host

Use the static host when validating the SillyTavern bridge locally. This keeps
the generated classic scripts unmodified and serves both normal local paths and
GitHub Pages-style `/project-dokuha/...` paths.

```bash
npm run build:st-bridge
npm run serve:local
```

Local SillyTavern load snippet:

```js
window.ST_BRIDGE_PACK = 'dokuha-main';
window.ST_BRIDGE_ENV = 'local';
window.DOKUHA_APP_BASE_URL = 'http://127.0.0.1:4173';
window.ST_BRIDGE_URL = 'http://127.0.0.1:4173/apps/st-bridge/bridge.js';
import 'http://127.0.0.1:4173/apps/st-bridge/bridge.js?env=local&appBase=http%3A%2F%2F127.0.0.1%3A4173&force=1&v=dev';
```

If 4173 is busy, the local host automatically tries the next port and prints a
ready-to-copy bridge URL with the matching `appBase` parameter.

Production load snippet:

```js
window.ST_BRIDGE_PACK = 'dokuha-main';
window.ST_BRIDGE_ENV = 'prod';
window.ST_BRIDGE_URL = 'https://hasheeper.github.io/project-dokuha/apps/st-bridge/bridge.js';
import 'https://hasheeper.github.io/project-dokuha/apps/st-bridge/bridge.js?env=prod';
```

## Architecture

- `index.html` is the canonical GitHub Pages app container.
- `registry/apps.json` is the source of truth for app routing.
- `containers/app.html` and `containers/tavern.html` are thin iframe hosts.
- `apps/live-stream/index.html` is the default DOKUHA live stream UI app.
- `src/protocol/` defines typed `postMessage` contracts.
- `src/container/` defines the Web Components app shell and frame host.
- `src/st-bridge/` is the TypeScript source for the SillyTavern bridge.
- `apps/st-bridge/bridge.js` is the generated stable SillyTavern loader.
- `apps/st-bridge/manifest.json` selects bridge packs and load order.

## Bridge MVUZ

SillyTavern should load:

```text
https://hasheeper.github.io/project-dokuha/apps/st-bridge/bridge.js
```

The bridge exposes a minimal MVUZ layer on `window.STBridge.mvuz`:

- `registerSchema(namespace, schema)`
- `read(namespace)`
- `write(namespace, state)`
- `patch(namespace, patcher)`
- `migrate(namespace, legacyVars)`

The default namespace is `dokuha`, stored at `stat_data.dokuha`.

The bridge profile controls whether DOKUHA app iframes resolve to GitHub Pages
or the local static server. `STBridge.state.env`, `STBridge.state.appBaseUrl`,
and `STBridge.state.statusUrl` show the active profile at runtime.
