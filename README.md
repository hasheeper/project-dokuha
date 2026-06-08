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
