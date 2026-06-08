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
