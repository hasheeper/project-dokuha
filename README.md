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

Local SillyTavern loader snippet:

```js
await import('http://127.0.0.1:4173/apps/st-bridge/dokuha-bridge-loader.js?env=local&force=1&v=dokuha-local-10');
```

Compact local snippet:

```js
await import('http://127.0.0.1:4173/apps/st-bridge/snippets/dokuha-local.js?v=dokuha-local-10');
```

本机正则表情差分 wrapper 使用 `ST/regex/local/DOKUHA_EXP.local.html`；云端使用
`ST/regex/DOKUHA_EXP.html`。两者都用 `$4` 接收正则捕获出的 `exp_*` 表情名，
并会从当前 `stat_data.dokuha` 读取衣服和配件。

If 4173 is busy, the local host automatically tries the next port and prints a
ready-to-copy snippet with the matching `appBase` parameter.

The loader exposes JS-Slash-Runner APIs through `window.DOKUHA_ST_API`, initializes
`stat_data.dokuha` if it is missing, registers `[initvar]`, and injects the
floating DOKUHA status window.

Production load snippet:

```js
await import('https://hasheeper.github.io/project-dokuha/apps/st-bridge/dokuha-bridge-loader.js?env=prod&force=1&v=dokuha-prod-9');
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
- `ST/dokuha-main/init/initvar.txt` is the SillyTavern initial variable template.

## Bridge MVUZ

`bridge.js` is an internal generated asset. In SillyTavern, load
`dokuha-bridge-loader.js`; it exposes JS-Slash-Runner APIs, initializes MVU, and
starts the floating status window.

```text
https://hasheeper.github.io/project-dokuha/apps/st-bridge/dokuha-bridge-loader.js
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
