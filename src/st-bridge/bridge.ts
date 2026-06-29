/// <reference path="./global.d.ts" />

/**
 * Stable Project DOKUHA SillyTavern bridge.
 *
 * ST should import only this file. The bridge selects a pack from manifest.json
 * and loads its scripts in a deterministic order.
 */
import {
  DEFAULT_DOKUHA_STATE as SHARED_DEFAULT_DOKUHA_STATE,
  cloneJson,
  normalizeDokuhaState as normalizeSharedDokuhaState
} from './shared/dokuha';

type BridgeRoot = typeof globalThis & Window & Record<string, any>;
type BridgeScorer = (candidate: BridgeRoot) => number;
type BridgeVariablesOptions = { type?: string; rootKey?: string; [key: string]: any };
type BridgePatcher = (draft: any, current: unknown) => unknown | Promise<unknown>;
type BridgeActionHandler = (payload?: unknown) => unknown | Promise<unknown>;
declare const __DOKUHA_BRIDGE_BUILD_CACHE_KEY__: string | undefined;

interface BridgeManifest {
  version?: string;
  activePack?: string;
  defaultPack?: string;
  packs?: Record<string, BridgePack>;
}

interface BridgePack {
  product?: string;
  label?: string;
  globals?: Record<string, unknown>;
  scripts?: BridgePackScript[];
}

interface BridgePackScript {
  id?: string;
  type?: string;
  url: string;
  required?: boolean;
}

interface LoadedScript {
  id?: string;
  type: string;
  url: string;
}

type BridgeEnv = 'local' | 'prod';

interface BridgeProfile {
  env: BridgeEnv;
  appBaseUrl: string;
  appUrl: string;
  statusUrl: string;
}

interface BridgeState {
  bridgeVersion: string;
  manifestUrl: string;
  manifestVersion: string;
  packId: string;
  product: string;
  label: string;
  env: BridgeEnv;
  appBaseUrl: string;
  appUrl: string;
  statusUrl: string;
  loaded: LoadedScript[];
  loadedAt: string;
}

interface BridgeSchemaInput {
  version?: string;
  rootKey?: string;
  defaults?: unknown;
  makeDefaultState?: () => unknown;
  normalize?: (value: unknown) => unknown;
  migrate?: ((legacyVars: unknown) => unknown | Promise<unknown>) | null;
}

interface RegisteredBridgeSchema {
  namespace: string;
  version: string;
  rootKey: string;
  makeDefaultState: () => unknown;
  normalize: (value: unknown) => unknown;
  migrate: ((legacyVars: unknown) => unknown | Promise<unknown>) | null;
}

(async function () {
  'use strict';

  const ROOT = (typeof window !== 'undefined' ? window : globalThis) as BridgeRoot;
  const BRIDGE_NAME = '[DOKUHA ST Bridge]';
  const VERSION = '0.1.0';
  const DEFAULT_MANIFEST = './manifest.json';
  const PROD_APP_BASE_URL = 'https://hasheeper.github.io/project-dokuha';
  const LOCAL_APP_BASE_URL = 'http://127.0.0.1:4173';
  const APP_ROUTE = 'index.html?app=live-stream';
  const STATUS_PATH = 'apps/live-stream/index.html';
  const FALLBACK_BRIDGE_URL = 'https://hasheeper.github.io/project-dokuha/apps/st-bridge/bridge.js';

  function pushWindowCandidate(candidates: BridgeRoot[], value: unknown): void {
    try {
      const candidate = value as BridgeRoot | null | undefined;
      if (!candidate || candidates.includes(candidate)) return;
      candidates.push(candidate);
    } catch (_) {}
  }

  function getWindowCandidates(): BridgeRoot[] {
    const candidates: BridgeRoot[] = [];
    pushWindowCandidate(candidates, ROOT);
    pushWindowCandidate(candidates, globalThis as BridgeRoot);
    try { pushWindowCandidate(candidates, typeof window !== 'undefined' ? window : null); } catch (_) {}
    try { pushWindowCandidate(candidates, typeof unsafeWindow === 'object' ? unsafeWindow : null); } catch (_) {}
    Array.from(candidates).forEach((candidate) => {
      try { pushWindowCandidate(candidates, candidate.parent); } catch (_) {}
      try { pushWindowCandidate(candidates, candidate.parent?.parent); } catch (_) {}
      try { pushWindowCandidate(candidates, candidate.top); } catch (_) {}
      try { pushWindowCandidate(candidates, candidate.DOKUHA_ST_API); } catch (_) {}
    });
    return candidates;
  }

  function getCandidateDocument(candidate: BridgeRoot): Document | null {
    try {
      return candidate?.document || null;
    } catch (_) {
      return null;
    }
  }

  function hasCandidateFunction(candidate: BridgeRoot, key: string): boolean {
    try {
      return typeof candidate?.[key] === 'function';
    } catch (_) {
      return false;
    }
  }

  function hasCandidateValue(candidate: BridgeRoot, key: string): boolean {
    try {
      return Boolean(candidate?.[key]);
    } catch (_) {
      return false;
    }
  }

  function queryCandidateDocument(candidate: BridgeRoot, selector: string): boolean {
    const doc = getCandidateDocument(candidate);
    try {
      return Boolean(doc?.querySelector?.(selector));
    } catch (_) {
      return false;
    }
  }

  function scoreUiRoot(candidate: BridgeRoot): number {
    const doc = getCandidateDocument(candidate);
    if (!doc) return -1;
    let score = 0;
    try { if (doc.body) score += 20; } catch (_) {}
    if (queryCandidateDocument(candidate, '#chat')) score += 160;
    if (queryCandidateDocument(candidate, '#chat .mes, .mes')) score += 90;
    if (queryCandidateDocument(candidate, '#send_form, #send_textarea, textarea')) score += 60;
    if (hasCandidateValue(candidate, 'SillyTavern')) score += 60;
    if (hasCandidateFunction(candidate, 'getVariables')) score += 45;
    if (hasCandidateFunction(candidate, 'eventOn')) score += 30;
    if (hasCandidateFunction(candidate, 'jQuery') || hasCandidateFunction(candidate, '$')) score += 25;
    if (candidate === ROOT) score += 1;
    return score;
  }

  function scoreApiRoot(candidate: BridgeRoot): number {
    let score = 0;
    if (hasCandidateFunction(candidate, 'getVariables')) score += 140;
    if (hasCandidateFunction(candidate, 'insertOrAssignVariables')) score += 120;
    if (hasCandidateFunction(candidate, 'updateVariablesWith')) score += 80;
    if (hasCandidateFunction(candidate, 'getChatMessages')) score += 70;
    if (hasCandidateFunction(candidate, 'setChatMessages')) score += 70;
    if (hasCandidateFunction(candidate, 'eventOn')) score += 50;
    if (hasCandidateFunction(candidate, 'handleVariablesInMessage')) score += 45;
    if (hasCandidateValue(candidate, 'Mvu')) score += 35;
    if (hasCandidateValue(candidate, 'SillyTavern')) score += 20;
    if (candidate === ROOT) score += 1;
    return score;
  }

  function pickBestWindow(candidates: BridgeRoot[], scorer: BridgeScorer, fallback: BridgeRoot = ROOT): BridgeRoot {
    let best = fallback;
    let bestScore = -1;
    candidates.forEach((candidate) => {
      const score = scorer(candidate);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    });
    return best || fallback;
  }

  const WINDOW_CANDIDATES = getWindowCandidates();
  const HOST_ROOT = pickBestWindow(WINDOW_CANDIDATES, scoreUiRoot, ROOT);
  const API_ROOT = pickBestWindow(WINDOW_CANDIDATES, scoreApiRoot, HOST_ROOT);

  function getBridgeTargets(): BridgeRoot[] {
    const targets: BridgeRoot[] = [];
    [ROOT, HOST_ROOT, API_ROOT, ...WINDOW_CANDIDATES].forEach((candidate) => pushWindowCandidate(targets, candidate));
    Array.from(targets).forEach((target) => {
      try { pushWindowCandidate(targets, target.DOKUHA_ST_API); } catch (_) {}
    });
    return targets;
  }

  function getGlobalValue(key: string): any {
    for (const candidate of getBridgeTargets()) {
      try {
        if (candidate?.[key] !== undefined && candidate?.[key] !== null && candidate?.[key] !== '') {
          return candidate[key];
        }
      } catch (_) {}
    }
    return undefined;
  }

  function publishHostInfo(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const info = {
      product: 'project-dokuha',
      version: VERSION,
      ownerRoot: ROOT,
      root: HOST_ROOT,
      uiRoot: HOST_ROOT,
      apiRoot: API_ROOT,
      candidates: WINDOW_CANDIDATES,
      ...extra
    };
    getBridgeTargets().forEach((target) => {
      try {
        target.DOKUHA_ST_HOST = info;
        target.DOKUHA_ST_HOST_ROOT = HOST_ROOT;
        target.DOKUHA_ST_UI_ROOT = HOST_ROOT;
        target.DOKUHA_ST_API_ROOT = API_ROOT;
      } catch (_) {}
    });
    return info;
  }

  publishHostInfo();

  function isObject(value: unknown): value is Record<string, any> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function clone<T = any>(value: unknown, fallback: T | null = null): T {
    return cloneJson(value, fallback);
  }

  function makeDefaultDokuhaState(): unknown {
    return clone(SHARED_DEFAULT_DOKUHA_STATE, SHARED_DEFAULT_DOKUHA_STATE);
  }

  function clampNumber(value: unknown, min: number, max: number, fallback = 0): number {
    const next = Number(value);
    if (!Number.isFinite(next)) return fallback;
    return Math.max(min, Math.min(max, Math.round(next)));
  }

  function normalizeDokuhaState(value: unknown): unknown {
    return normalizeSharedDokuhaState(value);
  }

  function normalizeString(value: unknown, fallback = ''): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  function normalizeBooleanFlag(value: unknown): boolean {
    if (value === true || value === 1) return true;
    const normalized = normalizeString(value, '').toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
  }

  function trimTrailingSlash(value: unknown): string {
    return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
  }

  function isLocalBridgeUrl(url: URL): boolean {
    try {
      const hostname = String(url.hostname || '').toLowerCase();
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
    } catch (_) {
      return false;
    }
  }

  function normalizeEnv(value: unknown, fallback: BridgeEnv = 'prod'): BridgeEnv {
    const normalized = normalizeString(value, '').toLowerCase();
    if (normalized === 'local' || normalized === 'prod') return normalized;
    return fallback;
  }

  function isUsableBridgeUrl(value: unknown): value is string {
    if (!value || typeof value !== 'string') return false;
    if (!/^https?:\/\//i.test(value)) return false;
    try {
      return new URL(value).pathname.endsWith('/bridge.js');
    } catch (_) {
      return false;
    }
  }

  function readBridgeUrlFromStack(): string {
    try {
      const stack = String(new Error().stack || '');
      const match = stack.match(/https?:\/\/[^\s)]+?\/bridge\.js(?:\?[^\s)]*)?/i);
      if (!match) return '';
      const value = match[0]
        .replace(/:\d+:\d+$/g, '')
        .replace(/:\d+$/g, '');
      return isUsableBridgeUrl(value) ? value : '';
    } catch (_) {
      return '';
    }
  }

  function getCurrentScriptUrl() {
    const stackUrl = readBridgeUrlFromStack();
    if (stackUrl) return stackUrl;
    try {
      const currentScript = document.currentScript as HTMLScriptElement | null;
      const currentScriptUrl = currentScript?.src;
      if (isUsableBridgeUrl(currentScriptUrl)) return currentScriptUrl;
    } catch (_) {}
    try {
      const scripts = Array.from(document.getElementsByTagName('script'));
      const matched = scripts.reverse().find((script) => isUsableBridgeUrl(script.src));
      if (matched && isUsableBridgeUrl(matched.src)) return matched.src;
    } catch (_) {}
    try {
      const configuredUrl = getGlobalValue('ST_BRIDGE_URL');
      if (isUsableBridgeUrl(configuredUrl)) return configuredUrl;
    } catch (_) {}
    return FALLBACK_BRIDGE_URL;
  }

  const bridgeUrl = new URL(getCurrentScriptUrl());
  const bridgeRoot = new URL('.', bridgeUrl);
  const params = bridgeUrl.searchParams;
  const buildCacheKey = typeof __DOKUHA_BRIDGE_BUILD_CACHE_KEY__ === 'string'
    ? __DOKUHA_BRIDGE_BUILD_CACHE_KEY__
    : 'dev';
  const cacheBust = params.get('v') || params.get('cache') || normalizeString(getGlobalValue('ST_BRIDGE_CACHE_BUST')) || buildCacheKey;
  const forceReload = params.get('force') === '1' || normalizeBooleanFlag(getGlobalValue('ST_BRIDGE_FORCE_RELOAD'));

  function resolveBridgeProfile(): BridgeProfile {
    const env = normalizeEnv(
      params.get('env') || getGlobalValue('ST_BRIDGE_ENV'),
      isLocalBridgeUrl(bridgeUrl) ? 'local' : 'prod'
    );
    const fallbackAppBaseUrl = env === 'local' ? LOCAL_APP_BASE_URL : PROD_APP_BASE_URL;
    const appBaseUrl = trimTrailingSlash(
      params.get('appBase') || getGlobalValue('DOKUHA_APP_BASE_URL') || fallbackAppBaseUrl
    ) || fallbackAppBaseUrl;
    return {
      env,
      appBaseUrl,
      appUrl: `${appBaseUrl}/${APP_ROUTE}`,
      statusUrl: `${appBaseUrl}/${STATUS_PATH}`
    };
  }

  const bridgeProfile = resolveBridgeProfile();

  publishHostInfo({
    bridgeUrl: bridgeUrl.href,
    bridgeRoot: bridgeRoot.href,
    env: bridgeProfile.env,
    appBaseUrl: bridgeProfile.appBaseUrl,
    appUrl: bridgeProfile.appUrl,
    statusUrl: bridgeProfile.statusUrl,
    cacheBust,
    forceReload
  });

  function withCache(url) {
    if (!cacheBust) return url;
    const next = new URL(url);
    next.searchParams.set('_dokuha_bridge_v', cacheBust);
    return next.href;
  }

  function resolveUrl(path, base = bridgeRoot.href) {
    return new URL(path, base).href;
  }

  async function fetchJson(url) {
    try {
      const response = await fetch(withCache(url), { cache: cacheBust ? 'reload' : 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch ${withCache(url)}: ${reason}`);
    }
  }

  async function fetchText(url) {
    try {
      const response = await fetch(withCache(url), { cache: cacheBust ? 'reload' : 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch ${withCache(url)}: ${reason}`);
    }
  }

  function getManifestUrl() {
    const explicit = params.get('manifest') || getGlobalValue('ST_BRIDGE_MANIFEST_URL');
    return explicit ? resolveUrl(explicit, bridgeRoot.href) : resolveUrl(DEFAULT_MANIFEST, bridgeRoot.href);
  }

  function selectPack(manifest) {
    const requested = params.get('pack') || getGlobalValue('ST_BRIDGE_PACK') || manifest.activePack || manifest.defaultPack;
    const pack = manifest.packs && manifest.packs[requested];
    if (!pack) {
      const available = Object.keys(manifest.packs || {}).join(', ') || '(none)';
      throw new Error(`Unknown pack "${requested}". Available packs: ${available}`);
    }
    return { id: requested, pack };
  }

  function applyGlobals(pack, packId, profile: BridgeProfile = bridgeProfile) {
    getBridgeTargets().forEach((target) => {
      try {
        target.ST_BRIDGE_PACK = packId;
        target.ST_BRIDGE_PRODUCT = pack.product || packId;
        if (isObject(pack.globals)) {
          Object.entries(pack.globals).forEach(([key, value]) => {
            target[key] = value;
          });
        }
        target.ST_BRIDGE_ENV = profile.env;
        target.DOKUHA_APP_BASE_URL = profile.appBaseUrl;
        target.DOKUHA_APP_URL = profile.appUrl;
        target.DOKUHA_STATUS_URL = profile.statusUrl;
      } catch (_) {}
    });
  }

  async function readVariables(options: any = {}) {
    const type = options.type || 'message';
    const request = { ...options, type };
    delete request.rootKey;
    if (typeof API_ROOT.getVariables !== 'function') {
      return isObject(API_ROOT.__DOKUHA_ST_BRIDGE_MEMORY__) ? clone(API_ROOT.__DOKUHA_ST_BRIDGE_MEMORY__, {}) : {};
    }
    try {
      const vars = await API_ROOT.getVariables(request);
      return isObject(vars) ? vars : {};
    } catch (error) {
      console.warn(`${BRIDGE_NAME} readVariables failed:`, error);
      return {};
    }
  }

  async function writeVariables(data, options: any = {}) {
    const type = options.type || 'message';
    const request = { ...options, type };
    delete request.rootKey;
    if (typeof API_ROOT.insertOrAssignVariables === 'function') {
      await API_ROOT.insertOrAssignVariables(data, request);
      return data;
    }
    if (typeof API_ROOT.updateVariablesWith === 'function') {
      return API_ROOT.updateVariablesWith((vars) => ({ ...(isObject(vars) ? vars : {}), ...data }), request);
    }
    API_ROOT.__DOKUHA_ST_BRIDGE_MEMORY__ = {
      ...(isObject(API_ROOT.__DOKUHA_ST_BRIDGE_MEMORY__) ? API_ROOT.__DOKUHA_ST_BRIDGE_MEMORY__ : {}),
      ...data
    };
    return data;
  }

  async function readState(rootKey = 'stat_data', stateKey: any = null, options: any = {}) {
    const vars = await readVariables(options);
    if (!stateKey) return isObject(vars[rootKey]) ? vars[rootKey] : null;
    return isObject(vars[rootKey] && vars[rootKey][stateKey]) ? vars[rootKey][stateKey] : null;
  }

  async function writeState(rootKey = 'stat_data', stateKey: any = null, state, options: any = {}) {
    if (!stateKey) {
      await writeVariables({ [rootKey]: state }, options);
      return state;
    }
    const vars = await readVariables(options);
    const root = isObject(vars[rootKey]) ? vars[rootKey] : {};
    const nextRoot = { ...root, [stateKey]: state };
    await writeVariables({ [rootKey]: nextRoot }, options);
    return state;
  }

  async function patchState(rootKey = 'stat_data', stateKey: any = null, patcher, options: any = {}) {
    const current = await readState(rootKey, stateKey, options);
    const draft = clone(current, {});
    const result = await patcher(draft, current);
    return writeState(rootKey, stateKey, result || draft, options);
  }

  const schemaRegistry: any = isObject(API_ROOT.__DOKUHA_MVUZ_SCHEMAS__) ? API_ROOT.__DOKUHA_MVUZ_SCHEMAS__ : {};
  getBridgeTargets().forEach((target) => {
    try { target.__DOKUHA_MVUZ_SCHEMAS__ = schemaRegistry; } catch (_) {}
  });

  function registerSchema(namespace, schema: any) {
    if (!namespace || !isObject(schema)) return null;
    schemaRegistry[namespace] = {
      namespace,
      version: schema.version || '0.1.0',
      rootKey: schema.rootKey || 'stat_data',
      makeDefaultState: typeof schema.makeDefaultState === 'function' ? schema.makeDefaultState : () => clone(schema.defaults, {}),
      normalize: typeof schema.normalize === 'function' ? schema.normalize : (value) => (isObject(value) ? clone(value, {}) : clone(schema.defaults, {})),
      migrate: typeof schema.migrate === 'function' ? schema.migrate : null
    };
    return schemaRegistry[namespace];
  }

  function getSchema(namespace = 'dokuha') {
    return schemaRegistry[namespace] || null;
  }

  function normalizeNamespaceState(namespace = 'dokuha', value = null) {
    const schema = getSchema(namespace);
    if (!schema) return isObject(value) ? clone(value, {}) : {};
    const base = value === undefined || value === null ? schema.makeDefaultState() : value;
    return schema.normalize(base);
  }

  async function readNamespace(namespace = 'dokuha', options: any = {}) {
    const schema = getSchema(namespace);
    const rootKey = options.rootKey || schema?.rootKey || 'stat_data';
    return normalizeNamespaceState(namespace, await readState(rootKey, namespace, options));
  }

  async function writeNamespace(namespace = 'dokuha', state, options: any = {}) {
    const schema = getSchema(namespace);
    const rootKey = options.rootKey || schema?.rootKey || 'stat_data';
    const normalized = normalizeNamespaceState(namespace, state);
    await writeState(rootKey, namespace, normalized, options);
    getBridgeTargets().forEach((target) => {
      try {
        target.dispatchEvent?.(new target.CustomEvent('dokuha:mvuz-written', {
          detail: { namespace, rootKey, state: normalized }
        }));
      } catch (_) {}
    });
    return normalized;
  }

  async function patchNamespace(namespace = 'dokuha', patcher, options: any = {}) {
    const current = await readNamespace(namespace, options);
    const draft = clone(current, {});
    const result = await patcher(draft, current);
    return writeNamespace(namespace, result || draft, options);
  }

  async function migrateNamespace(namespace = 'dokuha', legacyVars = null, options: any = {}) {
    const schema = getSchema(namespace);
    if (!schema || typeof schema.migrate !== 'function') {
      return writeNamespace(namespace, legacyVars || {}, options);
    }
    return writeNamespace(namespace, await schema.migrate(legacyVars || await readVariables(options)), options);
  }

  function exposeApi(state: BridgeState) {
    const existing = (isObject(API_ROOT.STBridge) ? API_ROOT.STBridge : {}) as Record<string, any> & {
      actionHandlers?: Record<string, Record<string, BridgeActionHandler>>;
    };
    const actionHandlers = existing.actionHandlers || {};
    const api = {
      ...existing,
      version: VERSION,
      state,
      host: publishHostInfo({
        bridgeUrl: bridgeUrl.href,
        bridgeRoot: bridgeRoot.href,
        env: bridgeProfile.env,
        appBaseUrl: bridgeProfile.appBaseUrl,
        appUrl: bridgeProfile.appUrl,
        statusUrl: bridgeProfile.statusUrl,
        cacheBust,
        forceReload
      }),
      actionHandlers,
      mvu: { readVariables, writeVariables, readState, writeState, patchState },
      mvuz: {
        schemas: schemaRegistry,
        registerSchema,
        getSchema,
        normalize: normalizeNamespaceState,
        read: readNamespace,
        write: writeNamespace,
        patch: patchNamespace,
        migrate: migrateNamespace
      },
      utils: {
        resolveUrl,
        withCache,
        bridgeRoot: bridgeRoot.href,
        env: state?.env || bridgeProfile.env,
        appBaseUrl: state?.appBaseUrl || bridgeProfile.appBaseUrl,
        appUrl: state?.appUrl || bridgeProfile.appUrl,
        statusUrl: state?.statusUrl || bridgeProfile.statusUrl
      },
      registerActions(namespace, handlers) {
        if (!namespace || !isObject(handlers)) return;
        actionHandlers[namespace] = { ...(actionHandlers[namespace] || {}), ...handlers };
      },
      async dispatch(namespace, action, payload = {}) {
        const handler = actionHandlers[namespace] && actionHandlers[namespace][action];
        if (typeof handler !== 'function') throw new Error(`No STBridge action handler for ${namespace}.${action}`);
        return handler(payload);
      },
      reload() {
        const next = new URL(bridgeUrl.href);
        next.searchParams.set('force', '1');
        next.searchParams.set('v', String(Date.now()));
        return import(/* @vite-ignore */ next.href);
      }
    };
    getBridgeTargets().forEach((target) => {
      try { target.STBridge = api; } catch (_) {}
    });
  }

  async function runClassicScript(url, scriptId) {
    const source = await fetchText(url);
    // Direct eval keeps JS-Slash-Runner's script scope in the lexical chain.
    // That lets pack scripts resolve Runner APIs such as eventOn/injectPrompts,
    // matching the tavern-script execution model.
    eval(`${source}\n//# sourceURL=${url}`);
    return { id: scriptId, type: 'script', url };
  }

  async function loadScript(entry, manifestUrl) {
    const type = entry.type || 'script';
    const url = resolveUrl(entry.url, manifestUrl);
    console.log(`${BRIDGE_NAME} loading ${entry.id || type}: ${url}`);
    if (type === 'module') {
      await import(/* @vite-ignore */ withCache(url));
      return { id: entry.id, type, url };
    }
    if (type === 'script' || type === 'classic') return runClassicScript(url, entry.id);
    throw new Error(`Unsupported script type "${type}" for ${entry.id || entry.url}`);
  }

  function getLoadedRegistry() {
    if (!isObject(API_ROOT.__DOKUHA_ST_BRIDGE_LOADED__)) API_ROOT.__DOKUHA_ST_BRIDGE_LOADED__ = {};
    getBridgeTargets().forEach((target) => {
      try { target.__DOKUHA_ST_BRIDGE_LOADED__ = API_ROOT.__DOKUHA_ST_BRIDGE_LOADED__; } catch (_) {}
    });
    return API_ROOT.__DOKUHA_ST_BRIDGE_LOADED__;
  }

  function publishBridgeReady(ready: Promise<unknown>): Promise<unknown> {
    getBridgeTargets().forEach((target) => {
      try { target.__DOKUHA_ST_BRIDGE_READY__ = ready; } catch (_) {}
    });
    return ready;
  }

  async function main() {
    const manifestUrl = getManifestUrl();
    const manifest = await fetchJson(manifestUrl);
    const { id: packId, pack } = selectPack(manifest);
    const registry = getLoadedRegistry();
    const registryKey = [
      manifestUrl,
      packId,
      bridgeProfile.env,
      bridgeProfile.appBaseUrl,
      cacheBust || 'default'
    ].join('::');

    if (registry[registryKey] && !forceReload) {
      exposeApi(registry[registryKey]);
      return registry[registryKey];
    }

    registerSchema('dokuha', {
      version: '0.1.0',
      rootKey: 'stat_data',
      makeDefaultState: makeDefaultDokuhaState,
      normalize: normalizeDokuhaState
    });

    applyGlobals(pack, packId, bridgeProfile);
    const state: any = {
      bridgeVersion: VERSION,
      manifestUrl,
      manifestVersion: manifest.version || '',
      packId,
      product: pack.product || packId,
      label: pack.label || packId,
      env: bridgeProfile.env,
      appBaseUrl: bridgeProfile.appBaseUrl,
      appUrl: bridgeProfile.appUrl,
      statusUrl: bridgeProfile.statusUrl,
      loaded: [],
      loadedAt: new Date().toISOString()
    };
    registry[registryKey] = state;
    exposeApi(state);

    for (const entry of pack.scripts || []) {
      try {
        state.loaded.push(await loadScript(entry, manifestUrl));
      } catch (error) {
        console.error(`${BRIDGE_NAME} failed to load ${entry.id || entry.url}:`, error);
        if (entry.required !== false) throw error;
      }
    }

    getBridgeTargets().forEach((target) => {
      try {
        target.dispatchEvent?.(new target.CustomEvent('dokuha:bridge-loaded', { detail: state }));
      } catch (_) {}
    });
    console.log(`${BRIDGE_NAME} loaded ${packId}`, state);
    return state;
  }

  const ready = main();
  publishBridgeReady(ready);
  await ready;
})();
