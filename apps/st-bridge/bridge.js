(function() {
  "use strict";
  const DOKUHA_STREAM_STATUSES = ["offline", "online", "brb", "ending"];
  const DEFAULT_DOKUHA_STATE = {
    affection: 0,
    energy: 72,
    mood: 68,
    streamStatus: "online",
    location: "LOCAL HOST",
    nowPlaying: "Night Drive / 88%",
    hostName: "狐坂 毒羽",
    handle: "LOSTRAB_722",
    statusComment: "连接稳定，直播协议保持在线。"
  };
  function normalizeDokuhaState(value) {
    const source = isRecord(value) ? value : {};
    return {
      affection: clampNumber(source.affection, 0, 255, DEFAULT_DOKUHA_STATE.affection),
      energy: clampNumber(source.energy, 0, 100, DEFAULT_DOKUHA_STATE.energy),
      mood: clampNumber(source.mood, 0, 100, DEFAULT_DOKUHA_STATE.mood),
      streamStatus: normalizeStreamStatus(source.streamStatus, DEFAULT_DOKUHA_STATE.streamStatus),
      location: normalizeString(source.location, DEFAULT_DOKUHA_STATE.location),
      nowPlaying: normalizeString(source.nowPlaying, DEFAULT_DOKUHA_STATE.nowPlaying),
      hostName: normalizeString(source.hostName, DEFAULT_DOKUHA_STATE.hostName),
      handle: normalizeString(source.handle, DEFAULT_DOKUHA_STATE.handle),
      statusComment: normalizeString(source.statusComment, DEFAULT_DOKUHA_STATE.statusComment)
    };
  }
  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }
  function clampNumber(value, min, max, fallback) {
    const next = Number(value);
    if (!Number.isFinite(next)) return fallback;
    return Math.max(min, Math.min(max, Math.round(next)));
  }
  function normalizeString(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }
  function normalizeStreamStatus(value, fallback = DEFAULT_DOKUHA_STATE.streamStatus) {
    return typeof value === "string" && DOKUHA_STREAM_STATUSES.includes(value) ? value : fallback;
  }
  function cloneJson(value, fallback) {
    if (value === void 0 || value === null) return fallback;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return fallback;
    }
  }
  (async function() {
    const ROOT = typeof window !== "undefined" ? window : globalThis;
    const BRIDGE_NAME = "[DOKUHA ST Bridge]";
    const VERSION = "0.1.0";
    const DEFAULT_MANIFEST = "./manifest.json";
    const PROD_APP_BASE_URL = "https://hasheeper.github.io/project-dokuha";
    const LOCAL_APP_BASE_URL = "http://127.0.0.1:4173";
    const APP_ROUTE = "index.html?app=live-stream";
    const STATUS_PATH = "apps/live-stream/index.html";
    const FALLBACK_BRIDGE_URL = "https://hasheeper.github.io/project-dokuha/apps/st-bridge/bridge.js";
    function pushWindowCandidate(candidates, value) {
      try {
        const candidate = value;
        if (!candidate || candidates.includes(candidate)) return;
        candidates.push(candidate);
      } catch (_) {
      }
    }
    function getWindowCandidates() {
      const candidates = [];
      pushWindowCandidate(candidates, ROOT);
      pushWindowCandidate(candidates, globalThis);
      try {
        pushWindowCandidate(candidates, typeof window !== "undefined" ? window : null);
      } catch (_) {
      }
      try {
        pushWindowCandidate(candidates, typeof unsafeWindow === "object" ? unsafeWindow : null);
      } catch (_) {
      }
      Array.from(candidates).forEach((candidate) => {
        try {
          pushWindowCandidate(candidates, candidate.parent);
        } catch (_) {
        }
        try {
          pushWindowCandidate(candidates, candidate.parent?.parent);
        } catch (_) {
        }
        try {
          pushWindowCandidate(candidates, candidate.top);
        } catch (_) {
        }
      });
      return candidates;
    }
    function getCandidateDocument(candidate) {
      try {
        return candidate?.document || null;
      } catch (_) {
        return null;
      }
    }
    function hasCandidateFunction(candidate, key) {
      try {
        return typeof candidate?.[key] === "function";
      } catch (_) {
        return false;
      }
    }
    function hasCandidateValue(candidate, key) {
      try {
        return Boolean(candidate?.[key]);
      } catch (_) {
        return false;
      }
    }
    function queryCandidateDocument(candidate, selector) {
      const doc = getCandidateDocument(candidate);
      try {
        return Boolean(doc?.querySelector?.(selector));
      } catch (_) {
        return false;
      }
    }
    function scoreUiRoot(candidate) {
      const doc = getCandidateDocument(candidate);
      if (!doc) return -1;
      let score = 0;
      try {
        if (doc.body) score += 20;
      } catch (_) {
      }
      if (queryCandidateDocument(candidate, "#chat")) score += 160;
      if (queryCandidateDocument(candidate, "#chat .mes, .mes")) score += 90;
      if (queryCandidateDocument(candidate, "#send_form, #send_textarea, textarea")) score += 60;
      if (hasCandidateValue(candidate, "SillyTavern")) score += 60;
      if (hasCandidateFunction(candidate, "getVariables")) score += 45;
      if (hasCandidateFunction(candidate, "eventOn")) score += 30;
      if (hasCandidateFunction(candidate, "jQuery") || hasCandidateFunction(candidate, "$")) score += 25;
      if (candidate === ROOT) score += 1;
      return score;
    }
    function scoreApiRoot(candidate) {
      let score = 0;
      if (hasCandidateFunction(candidate, "getVariables")) score += 140;
      if (hasCandidateFunction(candidate, "insertOrAssignVariables")) score += 120;
      if (hasCandidateFunction(candidate, "updateVariablesWith")) score += 80;
      if (hasCandidateFunction(candidate, "getChatMessages")) score += 70;
      if (hasCandidateFunction(candidate, "setChatMessages")) score += 70;
      if (hasCandidateFunction(candidate, "eventOn")) score += 50;
      if (hasCandidateFunction(candidate, "handleVariablesInMessage")) score += 45;
      if (hasCandidateValue(candidate, "Mvu")) score += 35;
      if (hasCandidateValue(candidate, "SillyTavern")) score += 20;
      if (candidate === ROOT) score += 1;
      return score;
    }
    function pickBestWindow(candidates, scorer, fallback = ROOT) {
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
    function getBridgeTargets() {
      const targets = [];
      [ROOT, HOST_ROOT, API_ROOT, ...WINDOW_CANDIDATES].forEach((candidate) => pushWindowCandidate(targets, candidate));
      return targets;
    }
    function getGlobalValue(key) {
      for (const candidate of getBridgeTargets()) {
        try {
          if (candidate?.[key] !== void 0 && candidate?.[key] !== null && candidate?.[key] !== "") {
            return candidate[key];
          }
        } catch (_) {
        }
      }
      return void 0;
    }
    function publishHostInfo(extra = {}) {
      const info = {
        product: "project-dokuha",
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
        } catch (_) {
        }
      });
      return info;
    }
    publishHostInfo();
    function isObject(value) {
      return Boolean(value) && typeof value === "object" && !Array.isArray(value);
    }
    function clone(value, fallback = null) {
      return cloneJson(value, fallback);
    }
    function makeDefaultDokuhaState() {
      return clone(DEFAULT_DOKUHA_STATE, DEFAULT_DOKUHA_STATE);
    }
    function normalizeDokuhaState$1(value) {
      return normalizeDokuhaState(value);
    }
    function normalizeString2(value, fallback = "") {
      return typeof value === "string" && value.trim() ? value.trim() : fallback;
    }
    function trimTrailingSlash(value) {
      return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
    }
    function isLocalBridgeUrl(url) {
      try {
        const hostname = String(url.hostname || "").toLowerCase();
        return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
      } catch (_) {
        return false;
      }
    }
    function normalizeEnv(value, fallback = "prod") {
      const normalized = normalizeString2(value, "").toLowerCase();
      if (normalized === "local" || normalized === "prod") return normalized;
      return fallback;
    }
    function isUsableBridgeUrl(value) {
      if (!value || typeof value !== "string") return false;
      if (!/^https?:\/\//i.test(value)) return false;
      try {
        return new URL(value).pathname.endsWith("/bridge.js");
      } catch (_) {
        return false;
      }
    }
    function getCurrentScriptUrl() {
      try {
        const currentScript = document.currentScript;
        const currentScriptUrl = currentScript?.src;
        if (isUsableBridgeUrl(currentScriptUrl)) return currentScriptUrl;
      } catch (_) {
      }
      try {
        const scripts = Array.from(document.getElementsByTagName("script"));
        const matched = scripts.reverse().find((script) => isUsableBridgeUrl(script.src));
        if (matched && isUsableBridgeUrl(matched.src)) return matched.src;
      } catch (_) {
      }
      try {
        const configuredUrl = getGlobalValue("ST_BRIDGE_URL");
        if (isUsableBridgeUrl(configuredUrl)) return configuredUrl;
      } catch (_) {
      }
      return FALLBACK_BRIDGE_URL;
    }
    const bridgeUrl = new URL(getCurrentScriptUrl());
    const bridgeRoot = new URL(".", bridgeUrl);
    const params = bridgeUrl.searchParams;
    const buildCacheKey = "bca22865b3e4";
    const cacheBust = params.get("v") || params.get("cache") || normalizeString2(getGlobalValue("ST_BRIDGE_CACHE_BUST")) || buildCacheKey;
    const forceReload = params.get("force") === "1";
    function resolveBridgeProfile() {
      const env = normalizeEnv(
        params.get("env") || getGlobalValue("ST_BRIDGE_ENV"),
        isLocalBridgeUrl(bridgeUrl) ? "local" : "prod"
      );
      const fallbackAppBaseUrl = env === "local" ? LOCAL_APP_BASE_URL : PROD_APP_BASE_URL;
      const appBaseUrl = trimTrailingSlash(
        params.get("appBase") || getGlobalValue("DOKUHA_APP_BASE_URL") || fallbackAppBaseUrl
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
      const next = new URL(url);
      next.searchParams.set("_dokuha_bridge_v", cacheBust);
      return next.href;
    }
    function resolveUrl(path, base = bridgeRoot.href) {
      return new URL(path, base).href;
    }
    async function fetchJson(url) {
      const response = await fetch(withCache(url), { cache: "reload" });
      if (!response.ok) throw new Error(`HTTP ${response.status} while loading ${url}`);
      return response.json();
    }
    async function fetchText(url) {
      const response = await fetch(withCache(url), { cache: "reload" });
      if (!response.ok) throw new Error(`HTTP ${response.status} while loading ${url}`);
      return response.text();
    }
    function getManifestUrl() {
      const explicit = params.get("manifest") || getGlobalValue("ST_BRIDGE_MANIFEST_URL");
      return explicit ? resolveUrl(explicit, bridgeRoot.href) : resolveUrl(DEFAULT_MANIFEST, bridgeRoot.href);
    }
    function selectPack(manifest) {
      const requested = params.get("pack") || getGlobalValue("ST_BRIDGE_PACK") || manifest.activePack || manifest.defaultPack;
      const pack = manifest.packs && manifest.packs[requested];
      if (!pack) {
        const available = Object.keys(manifest.packs || {}).join(", ") || "(none)";
        throw new Error(`Unknown pack "${requested}". Available packs: ${available}`);
      }
      return { id: requested, pack };
    }
    function applyGlobals(pack, packId, profile = bridgeProfile) {
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
        } catch (_) {
        }
      });
    }
    async function readVariables(options = {}) {
      const type = options.type || "message";
      const request = { ...options, type };
      delete request.rootKey;
      if (typeof API_ROOT.getVariables !== "function") {
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
    async function writeVariables(data, options = {}) {
      const type = options.type || "message";
      const request = { ...options, type };
      delete request.rootKey;
      if (typeof API_ROOT.insertOrAssignVariables === "function") {
        await API_ROOT.insertOrAssignVariables(data, request);
        return data;
      }
      if (typeof API_ROOT.updateVariablesWith === "function") {
        return API_ROOT.updateVariablesWith((vars) => ({ ...isObject(vars) ? vars : {}, ...data }), request);
      }
      API_ROOT.__DOKUHA_ST_BRIDGE_MEMORY__ = {
        ...isObject(API_ROOT.__DOKUHA_ST_BRIDGE_MEMORY__) ? API_ROOT.__DOKUHA_ST_BRIDGE_MEMORY__ : {},
        ...data
      };
      return data;
    }
    async function readState(rootKey = "stat_data", stateKey = null, options = {}) {
      const vars = await readVariables(options);
      if (!stateKey) return isObject(vars[rootKey]) ? vars[rootKey] : null;
      return isObject(vars[rootKey] && vars[rootKey][stateKey]) ? vars[rootKey][stateKey] : null;
    }
    async function writeState(rootKey = "stat_data", stateKey = null, state, options = {}) {
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
    async function patchState(rootKey = "stat_data", stateKey = null, patcher, options = {}) {
      const current = await readState(rootKey, stateKey, options);
      const draft = clone(current, {});
      const result = await patcher(draft, current);
      return writeState(rootKey, stateKey, result || draft, options);
    }
    const schemaRegistry = isObject(API_ROOT.__DOKUHA_MVUZ_SCHEMAS__) ? API_ROOT.__DOKUHA_MVUZ_SCHEMAS__ : {};
    getBridgeTargets().forEach((target) => {
      try {
        target.__DOKUHA_MVUZ_SCHEMAS__ = schemaRegistry;
      } catch (_) {
      }
    });
    function registerSchema(namespace, schema) {
      if (!namespace || !isObject(schema)) return null;
      schemaRegistry[namespace] = {
        namespace,
        version: schema.version || "0.1.0",
        rootKey: schema.rootKey || "stat_data",
        makeDefaultState: typeof schema.makeDefaultState === "function" ? schema.makeDefaultState : () => clone(schema.defaults, {}),
        normalize: typeof schema.normalize === "function" ? schema.normalize : (value) => isObject(value) ? clone(value, {}) : clone(schema.defaults, {}),
        migrate: typeof schema.migrate === "function" ? schema.migrate : null
      };
      return schemaRegistry[namespace];
    }
    function getSchema(namespace = "dokuha") {
      return schemaRegistry[namespace] || null;
    }
    function normalizeNamespaceState(namespace = "dokuha", value = null) {
      const schema = getSchema(namespace);
      if (!schema) return isObject(value) ? clone(value, {}) : {};
      const base = value === void 0 || value === null ? schema.makeDefaultState() : value;
      return schema.normalize(base);
    }
    async function readNamespace(namespace = "dokuha", options = {}) {
      const schema = getSchema(namespace);
      const rootKey = options.rootKey || schema?.rootKey || "stat_data";
      return normalizeNamespaceState(namespace, await readState(rootKey, namespace, options));
    }
    async function writeNamespace(namespace = "dokuha", state, options = {}) {
      const schema = getSchema(namespace);
      const rootKey = options.rootKey || schema?.rootKey || "stat_data";
      const normalized = normalizeNamespaceState(namespace, state);
      await writeState(rootKey, namespace, normalized, options);
      getBridgeTargets().forEach((target) => {
        try {
          target.dispatchEvent?.(new target.CustomEvent("dokuha:mvuz-written", {
            detail: { namespace, rootKey, state: normalized }
          }));
        } catch (_) {
        }
      });
      return normalized;
    }
    async function patchNamespace(namespace = "dokuha", patcher, options = {}) {
      const current = await readNamespace(namespace, options);
      const draft = clone(current, {});
      const result = await patcher(draft, current);
      return writeNamespace(namespace, result || draft, options);
    }
    async function migrateNamespace(namespace = "dokuha", legacyVars = null, options = {}) {
      const schema = getSchema(namespace);
      if (!schema || typeof schema.migrate !== "function") {
        return writeNamespace(namespace, legacyVars || {}, options);
      }
      return writeNamespace(namespace, await schema.migrate(legacyVars || await readVariables(options)), options);
    }
    function exposeApi(state) {
      const existing = isObject(API_ROOT.STBridge) ? API_ROOT.STBridge : {};
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
          actionHandlers[namespace] = { ...actionHandlers[namespace] || {}, ...handlers };
        },
        async dispatch(namespace, action, payload = {}) {
          const handler = actionHandlers[namespace] && actionHandlers[namespace][action];
          if (typeof handler !== "function") throw new Error(`No STBridge action handler for ${namespace}.${action}`);
          return handler(payload);
        },
        reload() {
          const next = new URL(bridgeUrl.href);
          next.searchParams.set("force", "1");
          next.searchParams.set("v", String(Date.now()));
          return import(
            /* @vite-ignore */
            next.href
          );
        }
      };
      getBridgeTargets().forEach((target) => {
        try {
          target.STBridge = api;
        } catch (_) {
        }
      });
    }
    async function runClassicScript(url, scriptId) {
      const source = await fetchText(url);
      (0, eval)(`${source}
//# sourceURL=${url}`);
      return { id: scriptId, type: "script", url };
    }
    async function loadScript(entry, manifestUrl) {
      const type = entry.type || "script";
      const url = resolveUrl(entry.url, manifestUrl);
      console.log(`${BRIDGE_NAME} loading ${entry.id || type}: ${url}`);
      if (type === "module") {
        await import(
          /* @vite-ignore */
          withCache(url)
        );
        return { id: entry.id, type, url };
      }
      if (type === "script" || type === "classic") return runClassicScript(url, entry.id);
      throw new Error(`Unsupported script type "${type}" for ${entry.id || entry.url}`);
    }
    function getLoadedRegistry() {
      if (!isObject(API_ROOT.__DOKUHA_ST_BRIDGE_LOADED__)) API_ROOT.__DOKUHA_ST_BRIDGE_LOADED__ = {};
      getBridgeTargets().forEach((target) => {
        try {
          target.__DOKUHA_ST_BRIDGE_LOADED__ = API_ROOT.__DOKUHA_ST_BRIDGE_LOADED__;
        } catch (_) {
        }
      });
      return API_ROOT.__DOKUHA_ST_BRIDGE_LOADED__;
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
        cacheBust
      ].join("::");
      if (registry[registryKey] && !forceReload) {
        exposeApi(registry[registryKey]);
        return registry[registryKey];
      }
      registerSchema("dokuha", {
        version: "0.1.0",
        rootKey: "stat_data",
        makeDefaultState: makeDefaultDokuhaState,
        normalize: normalizeDokuhaState$1
      });
      applyGlobals(pack, packId, bridgeProfile);
      const state = {
        bridgeVersion: VERSION,
        manifestUrl,
        manifestVersion: manifest.version || "",
        packId,
        product: pack.product || packId,
        label: pack.label || packId,
        env: bridgeProfile.env,
        appBaseUrl: bridgeProfile.appBaseUrl,
        appUrl: bridgeProfile.appUrl,
        statusUrl: bridgeProfile.statusUrl,
        loaded: [],
        loadedAt: (/* @__PURE__ */ new Date()).toISOString()
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
          target.dispatchEvent?.(new target.CustomEvent("dokuha:bridge-loaded", { detail: state }));
        } catch (_) {
        }
      });
      console.log(`${BRIDGE_NAME} loaded ${packId}`, state);
      return state;
    }
    await main();
  })();
})();
