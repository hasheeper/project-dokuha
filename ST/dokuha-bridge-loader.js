/**
 * Project DOKUHA SillyTavern loader.
 *
 * Put this in JS-Slash-Runner, or import the hosted wrapper:
 *   import 'http://127.0.0.1:4173/apps/st-bridge/dokuha-bridge-loader.js?env=local&force=1&v=dev';
 */
function readLoaderParams() {
  try {
    return new URL(import.meta.url).searchParams;
  } catch (_) {
    return new URLSearchParams();
  }
}

function trimTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function readHostedAppBase() {
  try {
    const url = new URL(import.meta.url);
    if (!/^https?:$/i.test(url.protocol)) return '';
    return trimTrailingSlash(new URL('..', url).href);
  } catch (_) {
    return '';
  }
}

function readGlobalFunction(name) {
  try {
    const value = window[name];
    return typeof value === 'function' ? value : null;
  } catch (_) {
    return null;
  }
}

const LOADER_PARAMS = readLoaderParams();
const LOADER_ENV = String(
  LOADER_PARAMS.get('env')
    || LOADER_PARAMS.get('mode')
    || window.DOKUHA_LOADER_ENV
    || window.ST_BRIDGE_ENV
    || 'local'
).toLowerCase() === 'prod'
  ? 'prod'
  : 'local';
const USE_LOCAL = LOADER_ENV === 'local';
const EXPLICIT_APP_BASE = trimTrailingSlash(
  LOADER_PARAMS.get('appBase')
    || LOADER_PARAMS.get('base')
    || window.DOKUHA_APP_BASE_URL
    || ''
);
const HOSTED_APP_BASE = readHostedAppBase();
const BRIDGE_BASE = trimTrailingSlash(
  EXPLICIT_APP_BASE
    || (USE_LOCAL ? HOSTED_APP_BASE || 'http://127.0.0.1:4173' : 'https://hasheeper.github.io/project-dokuha')
);
const CACHE_KEY = String(
  LOADER_PARAMS.get('v')
    || LOADER_PARAMS.get('cache')
    || window.DOKUHA_LOADER_CACHE_BUST
    || `dokuha-host-${Date.now()}`
);
const IMPORT_TIMEOUT_MS = Number(window.DOKUHA_LOADER_IMPORT_TIMEOUT_MS) > 0
  ? Number(window.DOKUHA_LOADER_IMPORT_TIMEOUT_MS)
  : 25000;
const READY_TIMEOUT_MS = Number(window.DOKUHA_LOADER_READY_TIMEOUT_MS) > 0
  ? Number(window.DOKUHA_LOADER_READY_TIMEOUT_MS)
  : 25000;
const LOADER_STARTED_AT = Date.now();

function setLoaderStatus(status, detail = {}) {
  window.__DOKUHA_LOADER_STATUS__ = {
    status,
    env: window.ST_BRIDGE_ENV,
    bridge: window.ST_BRIDGE_URL,
    cacheKey: CACHE_KEY,
    startedAt: new Date(LOADER_STARTED_AT).toISOString(),
    elapsedMs: Date.now() - LOADER_STARTED_AT,
    ...detail
  };
  return window.__DOKUHA_LOADER_STATUS__;
}

function formatErrorMessage(error) {
  if (!error) return 'unknown error';
  if (typeof error.message === 'string' && error.message) return error.message;
  return String(error);
}

function showNotice(level, title, message) {
  const normalizedLevel = ['success', 'info', 'warning', 'error'].includes(level) ? level : 'info';
  window.__DOKUHA_LAST_LOADER_NOTICE__ = {
    level: normalizedLevel,
    title,
    message,
    at: new Date().toISOString()
  };
  try {
    const toast = window.toastr;
    if (toast && typeof toast[normalizedLevel] === 'function') {
      toast[normalizedLevel](message, title, {
        closeButton: true,
        newestOnTop: true,
        timeOut: normalizedLevel === 'error' ? 0 : 4500,
        extendedTimeOut: 0
      });
      return true;
    }
  } catch (_) {}
  const method = normalizedLevel === 'error' ? 'error' : normalizedLevel === 'warning' ? 'warn' : 'log';
  console[method](`${title} ${message}`);
  return false;
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function getBridgeReadyPromise() {
  const ready = window.__DOKUHA_ST_BRIDGE_READY__;
  if (ready && typeof ready.then === 'function') return ready;
  if (window.STBridge && window.DOKUHAPlugin) return Promise.resolve(window.STBridge.state || true);
  return Promise.reject(new Error('DOKUHA bridge imported, but __DOKUHA_ST_BRIDGE_READY__ was not exposed.'));
}

function exposeRunnerApi() {
  const api = {
    eventOn: typeof eventOn === 'function' ? eventOn : readGlobalFunction('eventOn'),
    injectPrompts: typeof injectPrompts === 'function' ? injectPrompts : readGlobalFunction('injectPrompts'),
    uninjectPrompts: typeof uninjectPrompts === 'function' ? uninjectPrompts : readGlobalFunction('uninjectPrompts'),
    getVariables: typeof getVariables === 'function' ? getVariables : readGlobalFunction('getVariables'),
    insertOrAssignVariables: typeof insertOrAssignVariables === 'function'
      ? insertOrAssignVariables
      : readGlobalFunction('insertOrAssignVariables'),
    updateVariablesWith: typeof updateVariablesWith === 'function'
      ? updateVariablesWith
      : readGlobalFunction('updateVariablesWith'),
    handleVariablesInMessage: typeof handleVariablesInMessage === 'function'
      ? handleVariablesInMessage
      : readGlobalFunction('handleVariablesInMessage'),
    registerMacroLike: typeof registerMacroLike === 'function'
      ? registerMacroLike
      : readGlobalFunction('registerMacroLike'),
    unregisterMacroLike: typeof unregisterMacroLike === 'function'
      ? unregisterMacroLike
      : readGlobalFunction('unregisterMacroLike'),
    triggerSlash: typeof triggerSlash === 'function' ? triggerSlash : readGlobalFunction('triggerSlash'),
    Mvu: window.Mvu || null,
    tavern_events: typeof tavern_events === 'object' ? tavern_events : window.tavern_events || null
  };

  window.DOKUHA_ST_API = api;
  Object.entries(api).forEach(([key, value]) => {
    if (typeof value !== 'function') return;
    try {
      if (typeof window[key] !== 'function') window[key] = value;
    } catch (_) {}
  });
  return api;
}

window.ST_BRIDGE_PACK = 'dokuha-main';
window.ST_BRIDGE_ENV = USE_LOCAL ? 'local' : 'prod';
window.ST_BRIDGE_CACHE_BUST = CACHE_KEY;
window.ST_BRIDGE_FORCE_RELOAD = true;
window.DOKUHA_APP_BASE_URL = BRIDGE_BASE;
window.ST_BRIDGE_URL = `${BRIDGE_BASE}/apps/st-bridge/bridge.js`;

const RUNNER_API = exposeRunnerApi();
const bridgeUrl = new URL(window.ST_BRIDGE_URL);
bridgeUrl.searchParams.set('env', window.ST_BRIDGE_ENV);
bridgeUrl.searchParams.set('appBase', BRIDGE_BASE);
bridgeUrl.searchParams.set('force', '1');
bridgeUrl.searchParams.set('v', CACHE_KEY);
const BRIDGE_IMPORT_URL = bridgeUrl.href;

setLoaderStatus('loading', {
  importUrl: BRIDGE_IMPORT_URL,
  hasVariableApi: typeof RUNNER_API.getVariables === 'function' && typeof RUNNER_API.insertOrAssignVariables === 'function',
  hasPromptApi: typeof RUNNER_API.injectPrompts === 'function',
  hasEventApi: typeof RUNNER_API.eventOn === 'function',
  hasMacroApi: typeof RUNNER_API.registerMacroLike === 'function'
});

try {
  await withTimeout(
    import(BRIDGE_IMPORT_URL),
    IMPORT_TIMEOUT_MS,
    `DOKUHA bridge import timed out after ${Math.round(IMPORT_TIMEOUT_MS / 1000)}s`
  );
  await withTimeout(
    getBridgeReadyPromise(),
    READY_TIMEOUT_MS,
    `DOKUHA bridge ready timed out after ${Math.round(READY_TIMEOUT_MS / 1000)}s`
  );

  let initResult = null;
  try {
    initResult = await window.DOKUHAPlugin?.initVariables?.({ reason: 'loaderReady' });
  } catch (error) {
    console.warn('[DOKUHA Loader] initVariables failed:', error);
  }

  const detail = {
    importUrl: BRIDGE_IMPORT_URL,
    hasPlugin: Boolean(window.DOKUHAPlugin),
    hasVariableApi: typeof RUNNER_API.getVariables === 'function' && typeof RUNNER_API.insertOrAssignVariables === 'function',
    hasPromptApi: typeof RUNNER_API.injectPrompts === 'function',
    hasEventApi: typeof RUNNER_API.eventOn === 'function',
    hasMacroApi: typeof RUNNER_API.registerMacroLike === 'function',
    initResult
  };
  setLoaderStatus('ready', detail);
  showNotice('success', 'DOKUHA loaded', `Bridge ready in ${Math.round((Date.now() - LOADER_STARTED_AT) / 100) / 10}s.`);
  if (!detail.hasVariableApi) {
    showNotice('warning', 'DOKUHA variable API missing', 'Variables may not persist. Run this loader from JS-Slash-Runner.');
  }
  console.log('[DOKUHA Loader] loaded', detail);
} catch (error) {
  const message = formatErrorMessage(error);
  setLoaderStatus('error', {
    importUrl: BRIDGE_IMPORT_URL,
    error: message
  });
  console.error('[DOKUHA Loader] failed', error);
  showNotice('error', 'DOKUHA load failed', message);
  throw error;
}
