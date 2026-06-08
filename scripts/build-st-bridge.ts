import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { build, type InlineConfig } from 'vite';

type BridgeFormat = 'es' | 'iife';

interface BridgeEntry {
  input: string;
  outDir: string;
  fileName: string;
  format: BridgeFormat;
  name: string;
}

const rootDir = process.cwd();
const buildCacheKey = process.env.DOKUHA_BUILD_VERSION || await makeBuildCacheKey();

const entries: BridgeEntry[] = [
  {
    input: 'src/st-bridge/bridge.ts',
    outDir: 'apps/st-bridge',
    fileName: 'bridge.js',
    format: 'iife',
    name: 'DOKUHA_ST_BRIDGE'
  },
  {
    input: 'src/st-bridge/packs/dokuha-main/schema.ts',
    outDir: 'apps/st-bridge/packs/dokuha-main',
    fileName: 'schema.js',
    format: 'es',
    name: 'DOKUHA_SCHEMA'
  },
  {
    input: 'src/st-bridge/packs/dokuha-main/state-replay.ts',
    outDir: 'apps/st-bridge/packs/dokuha-main',
    fileName: 'state-replay.js',
    format: 'iife',
    name: 'DOKUHA_STATE_REPLAY'
  },
  {
    input: 'src/st-bridge/packs/dokuha-main/prompt-injection.ts',
    outDir: 'apps/st-bridge/packs/dokuha-main',
    fileName: 'prompt-injection.js',
    format: 'iife',
    name: 'DOKUHA_PROMPT_INJECTION'
  },
  {
    input: 'src/st-bridge/packs/dokuha-main/status-host.ts',
    outDir: 'apps/st-bridge/packs/dokuha-main',
    fileName: 'status-host.js',
    format: 'iife',
    name: 'DOKUHA_STATUS_HOST'
  },
  {
    input: 'src/st-bridge/packs/dokuha-main/plugin.ts',
    outDir: 'apps/st-bridge/packs/dokuha-main',
    fileName: 'plugin.js',
    format: 'iife',
    name: 'DOKUHA_MAIN_PACK'
  }
];

function makeConfig(entry: BridgeEntry): InlineConfig {
  const input = resolve(rootDir, entry.input);
  const outDir = resolve(rootDir, entry.outDir);

  return {
    configFile: false,
    publicDir: false,
    logLevel: 'warn',
    define: {
      __DOKUHA_BRIDGE_BUILD_CACHE_KEY__: JSON.stringify(buildCacheKey)
    },
    build: {
      outDir,
      emptyOutDir: false,
      target: 'es2020',
      sourcemap: false,
      minify: false,
      cssCodeSplit: false,
      lib: {
        entry: input,
        name: entry.name,
        formats: [entry.format],
        fileName: () => entry.fileName
      },
      rollupOptions: {
        external: (id) => /^https?:\/\//i.test(id),
        output: {
          entryFileNames: entry.fileName,
          inlineDynamicImports: true,
          extend: false
        }
      }
    }
  };
}

for (const entry of entries) {
  await build(makeConfig(entry));
  console.log(`Built ${entry.outDir}/${entry.fileName}`);
}

async function makeBuildCacheKey(): Promise<string> {
  const hash = createHash('sha256');
  const targets = [
    resolve(rootDir, 'apps/st-bridge/manifest.json'),
    resolve(rootDir, 'package.json'),
    resolve(rootDir, 'apps/live-stream'),
    resolve(rootDir, 'src/dokuha'),
    resolve(rootDir, 'src/st-bridge')
  ];
  const files = (await Promise.all(targets.map(collectHashableFiles))).flat().sort();

  for (const file of files) {
    hash.update(relative(rootDir, file));
    hash.update('\0');
    hash.update(await readFile(file));
    hash.update('\0');
  }

  return hash.digest('hex').slice(0, 12);
}

async function collectHashableFiles(target: string): Promise<string[]> {
  const entries = await readdir(target, { withFileTypes: true }).catch(() => []);
  if (!entries.length) {
    const ext = extname(target);
    return ['.css', '.html', '.json', '.ts'].includes(ext) ? [target] : [];
  }

  const files = await Promise.all(entries.map(async (entry) => {
    const child = join(target, entry.name);
    if (entry.isDirectory()) return collectHashableFiles(child);
    if (!entry.isFile()) return [];
    return ['.css', '.html', '.json', '.ts'].includes(extname(entry.name)) ? [child] : [];
  }));

  return files.flat();
}
