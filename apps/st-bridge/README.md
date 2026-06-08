# DOKUHA ST Bridge

Stable SillyTavern entry for Project DOKUHA packs.

## Load

Production script:

```js
window.ST_BRIDGE_PACK = 'dokuha-main';
window.ST_BRIDGE_ENV = 'prod';
window.ST_BRIDGE_URL = 'https://hasheeper.github.io/project-dokuha/apps/st-bridge/bridge.js';
import 'https://hasheeper.github.io/project-dokuha/apps/st-bridge/bridge.js?env=prod';
```

Local testing:

```sh
npm run build:st-bridge
npm run serve:local
```

```js
window.ST_BRIDGE_PACK = 'dokuha-main';
window.ST_BRIDGE_ENV = 'local';
window.DOKUHA_APP_BASE_URL = 'http://127.0.0.1:4173';
window.ST_BRIDGE_URL = 'http://127.0.0.1:4173/apps/st-bridge/bridge.js';
import 'http://127.0.0.1:4173/apps/st-bridge/bridge.js?env=local&appBase=http%3A%2F%2F127.0.0.1%3A4173&force=1&v=dev';
```

If 4173 is busy, `serve:local` tries the next port and prints a bridge URL with
the matching `appBase` parameter.

The local host also accepts GitHub Pages-style paths, for example:

```text
http://127.0.0.1:4173/project-dokuha/apps/st-bridge/bridge.js?env=local&force=1&v=dev
```

## Profile

The bridge resolves a profile from the script URL, `ST_BRIDGE_ENV`, and query
parameters:

- `env=local` uses `http://127.0.0.1:4173`.
- `env=prod` uses `https://hasheeper.github.io/project-dokuha`.
- `appBase=http://127.0.0.1:4173` overrides the app/status iframe base URL.

The active profile is published to:

- `window.ST_BRIDGE_ENV`
- `window.DOKUHA_APP_BASE_URL`
- `window.DOKUHA_APP_URL`
- `window.DOKUHA_STATUS_URL`
- `window.STBridge.state`
- `window.STBridge.utils`

## Contract

`bridge.js` owns loading, ordering, cache busting, pack selection, host root
discovery, and shared MVU/MVUZ IO helpers. Pack scripts own DOKUHA behavior.

The default MVUZ namespace is `dokuha`, stored at `stat_data.dokuha`.
