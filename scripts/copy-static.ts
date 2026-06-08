import { cp, mkdir } from 'node:fs/promises';

const pairs: Array<[string, string]> = [
  ['registry', 'dist/registry'],
  ['apps/st-bridge', 'dist/apps/st-bridge']
];

await mkdir('dist', { recursive: true });

for (const [source, target] of pairs) {
  await cp(source, target, {
    recursive: true,
    filter: (path) => !path.endsWith('.DS_Store') && !path.endsWith('_old.png')
  });
}
