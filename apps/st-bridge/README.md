# DOKUHA ST Bridge

Stable SillyTavern entry for Project DOKUHA packs.

## Load

Production loader:

```js
await import('https://hasheeper.github.io/project-dokuha/apps/st-bridge/dokuha-bridge-loader.js?env=prod&force=1&v=dokuha-prod-9');
```

Local testing:

```sh
npm run local
```

```js
await import('http://127.0.0.1:4173/apps/st-bridge/dokuha-bridge-loader.js?env=local&force=1&v=dokuha-local-10');
```

Compact local snippet:

```js
await import('http://127.0.0.1:4173/apps/st-bridge/snippets/dokuha-local.js?v=dokuha-local-10');
```

Expression regex wrapper:

- Cloud: `ST/regex/DOKUHA_EXP.html`
- Local: `ST/regex/local/DOKUHA_EXP.local.html`

If 4173 is busy, `serve:local` tries the next port and prints a ready-to-copy
snippet with the matching `appBase` parameter.

The loader exposes `window.DOKUHA_ST_API`, runs non-destructive `initvar`, binds
`[initvar]` / `[dokuha:initvar]`, and starts the floating status trigger.

The local host also accepts GitHub Pages-style bridge asset paths for debugging,
for example:

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
