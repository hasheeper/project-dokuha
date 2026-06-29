#!/usr/bin/env node

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 4173;
const PROJECT_PREFIX = 'project-dokuha';
const LOCAL_CACHE_KEY = 'dokuha-local-10';

function readArg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1] || fallback;
}

function readFlag(name) {
  return process.argv.includes(`--${name}`);
}

function normalizeRoot(value) {
  return path.resolve(process.cwd(), value || '.');
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.ico') return 'image/x-icon';
  if (ext === '.woff') return 'font/woff';
  if (ext === '.woff2') return 'font/woff2';
  if (ext === '.ttf') return 'font/ttf';
  if (ext === '.wasm') return 'application/wasm';
  return 'application/octet-stream';
}

function writeCorsHeaders(res, extra = {}) {
  res.writeHead(extra.status || 200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    ...extra.headers
  });
}

function stripProjectPrefix(decodedPath) {
  if (decodedPath === `/${PROJECT_PREFIX}`) return '/';
  if (decodedPath.startsWith(`/${PROJECT_PREFIX}/`)) {
    return decodedPath.slice(PROJECT_PREFIX.length + 1) || '/';
  }
  return decodedPath;
}

function isInside(baseDir, filePath) {
  return filePath === baseDir || filePath.startsWith(baseDir + path.sep);
}

function makeCandidate(baseDir, relativePath) {
  const filePath = path.resolve(baseDir, relativePath);
  if (!isInside(baseDir, filePath)) return null;
  return filePath;
}

function addCandidate(candidates, baseDir, relativePath) {
  const filePath = makeCandidate(baseDir, relativePath);
  if (filePath && !candidates.includes(filePath)) candidates.push(filePath);
}

function buildCandidates(rootDir, requestPath) {
  const distDir = path.join(rootDir, 'dist');
  const normalizedPath = stripProjectPrefix(requestPath).replace(/^\/+/, '') || 'index.html';
  const candidates = [];

  if (normalizedPath.startsWith('apps/st-bridge/')) {
    addCandidate(candidates, rootDir, normalizedPath);
    addCandidate(candidates, distDir, normalizedPath);
  }

  if (
    normalizedPath === 'index.html' ||
    normalizedPath.startsWith('apps/') ||
    normalizedPath.startsWith('containers/') ||
    normalizedPath.startsWith('assets/')
  ) {
    addCandidate(candidates, distDir, normalizedPath);
  }

  if (normalizedPath.startsWith('dokuha-assets/standing/')) {
    addCandidate(candidates, distDir, normalizedPath);
    addCandidate(
      candidates,
      rootDir,
      normalizedPath.replace(/^dokuha-assets\/standing\//, 'src/assets/png/standing/')
    );
  }

  addCandidate(candidates, rootDir, normalizedPath);
  addCandidate(candidates, distDir, normalizedPath);
  return candidates;
}

async function resolveFilePath(rootDir, requestUrl) {
  const url = new URL(requestUrl || '/', 'http://127.0.0.1');
  const decodedPath = decodeURIComponent(url.pathname || '/');

  for (const candidate of buildCandidates(rootDir, decodedPath)) {
    const candidateStat = await stat(candidate).catch(() => null);
    if (candidateStat?.isDirectory()) {
      const indexPath = path.join(candidate, 'index.html');
      const indexStat = await stat(indexPath).catch(() => null);
      if (indexStat?.isFile()) return indexPath;
    }
    if (candidateStat?.isFile()) return candidate;
  }
  return null;
}

async function serveFile(req, res, rootDir) {
  if (req.method === 'OPTIONS') {
    writeCorsHeaders(res, { status: 204 });
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    writeCorsHeaders(res, { status: 405, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    res.end('Method Not Allowed');
    return;
  }

  const filePath = await resolveFilePath(rootDir, req.url);
  if (!filePath) {
    writeCorsHeaders(res, { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    res.end('Not Found');
    return;
  }

  const fileStat = await stat(filePath).catch(() => null);
  if (!fileStat?.isFile()) {
    writeCorsHeaders(res, { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    res.end('Not Found');
    return;
  }

  writeCorsHeaders(res, {
    headers: {
      'Content-Type': getMimeType(filePath),
      'Content-Length': String(fileStat.size),
      'Cache-Control': 'no-store'
    }
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

const rootDir = normalizeRoot(readArg('root', '.'));
const host = readArg('host', DEFAULT_HOST);
const port = Number(readArg('port', String(DEFAULT_PORT))) || DEFAULT_PORT;
const strictPort = readFlag('strict-port') || readArg('strict-port', '') === '1';
let currentPort = port;

const server = createServer((req, res) => {
  serveFile(req, res, rootDir).catch((error) => {
    console.error('[DOKUHA local server] request failed:', error);
    writeCorsHeaders(res, { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    res.end('Internal Server Error');
  });
});

function listen(nextPort) {
  currentPort = nextPort;
  server.listen(currentPort, host);
}

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE' && !strictPort) {
    const nextPort = currentPort + 1;
    console.warn(`[DOKUHA local server] port ${currentPort} is busy, trying ${nextPort}`);
    listen(nextPort);
    return;
  }
  throw error;
});

server.on('listening', () => {
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  const appBaseUrl = `http://${host}:${actualPort}`;
  const loaderUrl = `${appBaseUrl}/apps/st-bridge/dokuha-bridge-loader.js?env=local&appBase=${encodeURIComponent(appBaseUrl)}&force=1&v=${LOCAL_CACHE_KEY}`;
  const bridgeUrl = `${appBaseUrl}/apps/st-bridge/bridge.js?env=local&appBase=${encodeURIComponent(appBaseUrl)}&force=1&v=${LOCAL_CACHE_KEY}`;
  const snippetUrl = `${appBaseUrl}/apps/st-bridge/snippets/dokuha-local.js?v=${LOCAL_CACHE_KEY}`;
  const scriptPath = path.relative(process.cwd(), fileURLToPath(import.meta.url));
  console.log(`[DOKUHA local server] ${scriptPath}`);
  console.log(`[DOKUHA local server] serving ${rootDir}`);
  console.log(`[DOKUHA local server] ${appBaseUrl}`);
  console.log(`[DOKUHA local server] bridge asset ${bridgeUrl}`);
  console.log('[DOKUHA local server] SillyTavern local snippet:');
  console.log(`await import('${loaderUrl}');`);
  console.log('[DOKUHA local server] compact snippet:');
  console.log(`await import('${snippetUrl}');`);
});

listen(port);
