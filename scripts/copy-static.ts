import { cp, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const pairs: Array<[string, string]> = [
  ['registry', 'dist/registry'],
  ['apps/st-bridge', 'dist/apps/st-bridge'],
  ['ST', 'dist/ST'],
  ['src/assets/png/standing', 'dist/dokuha-assets/standing'],
  ['apps/live-stream/dokuha-spine-assets', 'dist/apps/live-stream/dokuha-spine-assets'],
  ['apps/live-stream/vendor', 'dist/apps/live-stream/vendor']
];

await mkdir('dist', { recursive: true });

for (const [source, target] of pairs) {
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, {
    recursive: true,
    filter: (path) => !path.endsWith('.DS_Store') && !path.endsWith('_old.png')
  });
}
