(function () {
  'use strict';

  const CURRENT_ROOT = typeof window !== 'undefined' ? window : globalThis;
  const PLUGIN_UNLOAD_KEY = '__DOKUHA_PLUGIN_UNLOAD__';
  const PROMPT_TOKEN_KEY = '__DOKUHA_PROMPT_INJECTION_TOKEN__';

  function resolveBridgeHost() {
    try { if (CURRENT_ROOT.DOKUHA_ST_HOST) return CURRENT_ROOT.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.DOKUHA_ST_HOST_ROOT?.DOKUHA_ST_HOST) return CURRENT_ROOT.DOKUHA_ST_HOST_ROOT.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.parent?.DOKUHA_ST_HOST) return CURRENT_ROOT.parent.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.top?.DOKUHA_ST_HOST) return CURRENT_ROOT.top.DOKUHA_ST_HOST; } catch (_) {}
    return {};
  }

  function getPluginTargets(host, root = null, uiRoot = null) {
    const targets = [];
    const pushTarget = (target) => {
      try {
        if (target && !targets.includes(target)) targets.push(target);
      } catch (_) {}
    };
    pushTarget(CURRENT_ROOT);
    pushTarget(globalThis);
    pushTarget(host.root);
    pushTarget(host.uiRoot);
    pushTarget(host.apiRoot);
    pushTarget(root);
    pushTarget(uiRoot);
    try { pushTarget(typeof unsafeWindow === 'object' ? unsafeWindow : null); } catch (_) {}
    (Array.isArray(host.candidates) ? host.candidates : []).forEach((target) => pushTarget(target));
    try { pushTarget(CURRENT_ROOT.parent); } catch (_) {}
    try { pushTarget(CURRENT_ROOT.top); } catch (_) {}
    targets.slice().forEach((target) => {
      try { pushTarget(target.parent); } catch (_) {}
      try { pushTarget(target.top); } catch (_) {}
      try { pushTarget(target.DOKUHA_ST_API); } catch (_) {}
    });
    return targets;
  }

  function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value, fallback: any = null): any {
    if (value === undefined || value === null) return fallback;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return fallback;
    }
  }

  function areJsonValuesEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function unloadPreviousPlugin(targets) {
    const unloads = [];
    targets.forEach((target) => {
      try {
        const previousUnload = target?.[PLUGIN_UNLOAD_KEY];
        if (typeof previousUnload === 'function' && !unloads.includes(previousUnload)) {
          unloads.push(previousUnload);
        }
      } catch (_) {}
    });
    unloads.forEach((previousUnload) => {
      try { previousUnload(); } catch (_) {}
    });
  }

  function exposePlugin(api, unload, targets) {
    targets.forEach((target) => {
      try {
        target.DOKUHAPlugin = api;
        target[PLUGIN_UNLOAD_KEY] = unload;
      } catch (_) {}
    });
  }

  const BRIDGE_HOST = resolveBridgeHost();
  const ROOT = BRIDGE_HOST.apiRoot || CURRENT_ROOT.DOKUHA_ST_API_ROOT || CURRENT_ROOT.DOKUHA_ST_HOST_ROOT || CURRENT_ROOT;
  const UI_ROOT = BRIDGE_HOST.root || BRIDGE_HOST.uiRoot || CURRENT_ROOT.DOKUHA_ST_UI_ROOT || ROOT;
  const bridge = ROOT.STBridge || CURRENT_ROOT.STBridge || UI_ROOT.STBridge;
  if (!bridge) return;
  const pluginTargets = getPluginTargets(BRIDGE_HOST, ROOT, UI_ROOT);
  unloadPreviousPlugin(pluginTargets);

  const RUNTIME = ROOT.DOKUHAMainRuntime || CURRENT_ROOT.DOKUHAMainRuntime || {};
  ROOT.DOKUHAMainRuntime = RUNTIME;
  CURRENT_ROOT.DOKUHAMainRuntime = RUNTIME;
  const stateService = typeof RUNTIME.createStateReplay === 'function'
    ? RUNTIME.createStateReplay()
    : null;
  const promptRuntime = stateService && typeof RUNTIME.createPromptInjection === 'function'
    ? RUNTIME.createPromptInjection(stateService)
    : null;
  const statusCacheKey = typeof bridge.host?.cacheBust === 'string' && bridge.host.cacheBust.trim()
    ? bridge.host.cacheBust.trim()
    : bridge.version || '0.1.0';
  const statusHost = stateService && typeof RUNTIME.createStatusHost === 'function'
    ? RUNTIME.createStatusHost(stateService, { version: statusCacheKey, cacheBust: statusCacheKey })
    : null;
  const cleanupCallbacks: Array<() => void> = [];
  const temporalStop = stateService?.startTemporalSync?.();
  if (typeof temporalStop === 'function') {
    cleanupCallbacks.push(() => {
      try { temporalStop(); } catch (_) {}
    });
  } else if (temporalStop && typeof temporalStop.stop === 'function') {
    cleanupCallbacks.push(() => {
      try { temporalStop.stop(); } catch (_) {}
    });
  }
  let disposed = false;
  let pluginApi: any = null;
  const promptToken = {};
  try { ROOT[PROMPT_TOKEN_KEY] = promptToken; } catch (_) {}
  cleanupCallbacks.push(() => {
    try {
      if (ROOT[PROMPT_TOKEN_KEY] === promptToken) delete ROOT[PROMPT_TOKEN_KEY];
    } catch (_) {}
  });

  async function loadState(options: any = {}) {
    return stateService ? stateService.loadState(options) : bridge.mvuz.read('dokuha', options);
  }

  function makeDefaultState() {
    const runtimeDefault = ROOT.DOKUHASchemaRuntime?.makeDefaultDokuhaState;
    if (typeof runtimeDefault === 'function') return runtimeDefault();
    const schemaDefault = bridge.mvuz?.getSchema?.('dokuha')?.makeDefaultState;
    if (typeof schemaDefault === 'function') return schemaDefault();
    return {};
  }

  function makeDefaultSystemState() {
    const runtimeDefault = ROOT.DOKUHASchemaRuntime?.makeDefaultDokuhaSystemState;
    if (typeof runtimeDefault === 'function') return runtimeDefault();
    return {
      current_time: { year: 2024, month: 4, day: 1, hour: 20, minute: 0, day_of_week: '周一' },
      time_advance: null,
      time_set_to: null,
      event_start: { name: null, type: null }
    };
  }

  function normalizeState(value) {
    const normalize = ROOT.DOKUHASchemaRuntime?.normalizeDokuhaState;
    if (typeof normalize === 'function') return normalize(value);
    if (typeof bridge.mvuz?.normalize === 'function') return bridge.mvuz.normalize('dokuha', value);
    return isObject(value) ? clone(value, {}) : makeDefaultState();
  }

  function normalizeSystemState(value) {
    const normalize = ROOT.DOKUHASchemaRuntime?.normalizeDokuhaSystemState;
    if (typeof normalize === 'function') return normalize(value);
    return isObject(value) ? clone(value, {}) : makeDefaultSystemState();
  }

  async function initState(options: any = {}) {
    const readOptions = {
      ...(isObject(options) ? options : {}),
      type: options?.type || 'message'
    };
    const rawVars = await bridge.mvu.readVariables(readOptions);
    const statData = isObject(rawVars?.stat_data) ? rawVars.stat_data : {};
    const previous = statData.dokuha;
    const previousSystem = statData.system;
    const forced = options?.force === true || options?.reset === true;
    const seed = isObject(options?.state)
      ? options.state
      : (forced || !isObject(previous) ? makeDefaultState() : { ...makeDefaultState(), ...previous });
    const systemSeed = isObject(options?.system)
      ? options.system
      : (forced || !isObject(previousSystem) ? makeDefaultSystemState() : { ...makeDefaultSystemState(), ...previousSystem });
    const state = normalizeState(seed);
    const system = normalizeSystemState(systemSeed);
    const changed = forced || !isObject(previous) || !areJsonValuesEqual(previous, state) || !isObject(previousSystem) || !areJsonValuesEqual(previousSystem, system);
    if (changed) {
      await bridge.mvu.writeVariables({
        stat_data: {
          ...statData,
          dokuha: state,
          system
        }
      }, readOptions);
      try { stateService?.notifyStateChanged?.(state); } catch (_) {}
    }
    await refreshStatus(options?.reason || (changed ? 'initvar' : 'initvarUnchanged'));
    return {
      ok: true,
      namespace: 'dokuha',
      rootKey: 'stat_data',
      created: !isObject(previous),
      changed,
      forced,
      state
    };
  }

  async function loadContext(options: any = {}) {
    if (typeof stateService?.loadContext === 'function') return stateService.loadContext(options);
    const rawVars = await bridge.mvu.readVariables({ ...(isObject(options) ? options : {}), type: options?.type || 'message' });
    const statData = isObject(rawVars?.stat_data) ? rawVars.stat_data : {};
    return {
      statData,
      dokuha: normalizeState(statData.dokuha),
      system: normalizeSystemState(statData.system)
    };
  }

  async function saveState(nextState, options: any = {}) {
    const state = stateService
      ? await stateService.saveState(nextState, options)
      : await bridge.mvuz.write('dokuha', nextState, options);
    await refreshStatus(options.reason || 'saveState');
    return state;
  }

  async function patchState(patcher, options: any = {}) {
    const state = stateService
      ? await stateService.patchState(patcher, options)
      : await bridge.mvuz.patch('dokuha', patcher, options);
    await refreshStatus(options.reason || 'patchState');
    return state;
  }

  async function getFamiliarityProfile(options: any = {}) {
    const state = await loadState(options);
    const derive = ROOT.DOKUHASchemaRuntime?.deriveFamiliarityProfile || ROOT.DOKUHASchemaRuntime?.deriveAffectionProfile;
    if (typeof derive === 'function') return derive(state);
    const familiarity = state?.familiarity && typeof state.familiarity === 'object' ? state.familiarity : {};
    const coreStates = state?.coreStates && typeof state.coreStates === 'object' ? state.coreStates : {};
    const points = Math.max(0, Math.min(500, Math.round(Number(familiarity.points) || 0)));
    return {
      familiarityPoints: points,
      familiarityTier: points >= 250 ? 'high' : points >= 100 ? 'mid' : 'low',
      attachmentLevel: coreStates.attachmentLevel || 'non_attached',
      relationshipStage: coreStates.relationshipStage || 'neighbor',
      thresholds: {
        relationship: { friend: 100, lover: 150 },
        attachment: { light_attached: 75, heavy_attached: 175 },
        tier: { mid: 100, high: 250 }
      }
    };
  }

  const getAffectionProfile = getFamiliarityProfile;

  async function refreshStatus(reason = 'refresh') {
    if (disposed) return false;
    if (!statusHost) return false;
    return statusHost.refreshStatus(reason);
  }

  function bindPromptInjection() {
    if (!promptRuntime) return;
    const eventApi = findEventApi();
    if (!eventApi) {
      console.warn('[DOKUHA Prompt] eventOn is unavailable. Expose JS-Slash-Runner APIs with window.DOKUHA_ST_API before loading DOKUHA bridge.');
      return;
    }
    const handler = (...args) => {
      if (disposed) return;
      try {
        if (ROOT[PROMPT_TOKEN_KEY] !== promptToken) return;
      } catch (_) {}
      return promptRuntime.injectCurrentState(...args);
    };
    const stop = eventApi.eventOn(getPromptEventName(eventApi), handler);
    cleanupCallbacks.push(() => {
      try {
        if (typeof stop === 'function') stop();
        else if (stop && typeof stop.stop === 'function') stop.stop();
      } catch (_) {}
    });
    console.log(`[DOKUHA Prompt] bound GENERATION_AFTER_COMMANDS via ${eventApi.source}`);
  }

  function pushEventApi(apis, seen, api, thisArg, source) {
    try {
      if (!api || typeof api.eventOn !== 'function' || seen.includes(api.eventOn)) return;
      seen.push(api.eventOn);
      apis.push({
        source,
        target: api,
        eventOn(eventName, handler) {
          return api.eventOn.call(thisArg || api, eventName, handler);
        }
      });
    } catch (_) {}
  }

  function findEventApi() {
    const apis = [];
    const seen = [];
    try {
      if (typeof eventOn === 'function') {
        pushEventApi(apis, seen, { eventOn, tavern_events: typeof tavern_events === 'object' ? tavern_events : null }, null, 'direct');
      }
    } catch (_) {}
    pluginTargets.forEach((target) => {
      try { pushEventApi(apis, seen, target?.DOKUHA_ST_API, target?.DOKUHA_ST_API, 'DOKUHA_ST_API'); } catch (_) {}
      try { pushEventApi(apis, seen, target, target, 'window'); } catch (_) {}
    });
    return apis[0] || null;
  }

  function getPromptEventName(eventApi) {
    try {
      return eventApi?.target?.tavern_events?.GENERATION_AFTER_COMMANDS || 'GENERATION_AFTER_COMMANDS';
    } catch (_) {
      return 'GENERATION_AFTER_COMMANDS';
    }
  }

  function pushMacroApi(apis, seen, api, thisArg, source) {
    try {
      if (!api || typeof api.registerMacroLike !== 'function' || seen.includes(api.registerMacroLike)) return;
      seen.push(api.registerMacroLike);
      apis.push({
        source,
        registerMacroLike(regex, replacer) {
          return api.registerMacroLike.call(thisArg || api, regex, replacer);
        },
        unregisterMacroLike(regex) {
          if (typeof api.unregisterMacroLike === 'function') return api.unregisterMacroLike.call(thisArg || api, regex);
          return null;
        }
      });
    } catch (_) {}
  }

  function findMacroApi() {
    const apis = [];
    const seen = [];
    try {
      if (typeof registerMacroLike === 'function') {
        pushMacroApi(apis, seen, { registerMacroLike, unregisterMacroLike: typeof unregisterMacroLike === 'function' ? unregisterMacroLike : null }, null, 'direct');
      }
    } catch (_) {}
    pluginTargets.forEach((target) => {
      try { pushMacroApi(apis, seen, target?.DOKUHA_ST_API, target?.DOKUHA_ST_API, 'DOKUHA_ST_API'); } catch (_) {}
      try { pushMacroApi(apis, seen, target, target, 'window'); } catch (_) {}
    });
    return apis[0] || null;
  }

  function bindInitVarMacro() {
    const macroApi = findMacroApi();
    if (!macroApi) {
      console.warn('[DOKUHA InitVar] registerMacroLike unavailable; use window.DOKUHAPlugin.initVariables().');
      return;
    }
    const regex = /\[(?:dokuha:)?initvar\]/gi;
    const handle = macroApi.registerMacroLike(regex, (context) => {
      void initState({
        reason: 'macro:initvar',
        messageId: context?.message_id,
        message_id: context?.message_id
      }).catch((error) => console.warn('[DOKUHA InitVar] macro init failed:', error));
      return '';
    });
    cleanupCallbacks.push(() => {
      try {
        if (handle && typeof handle.unregister === 'function') handle.unregister();
        else macroApi.unregisterMacroLike(regex);
      } catch (_) {}
    });
    console.log(`[DOKUHA InitVar] bound [initvar] via ${macroApi.source}`);
  }

  const actionHandlers = {
    async ping(payload) {
      return {
        ok: true,
        product: 'project-dokuha',
        received: payload || {},
        at: new Date().toISOString()
      };
    },
    async openDashboard() {
      const opened = Boolean(statusHost?.openStatus?.());
      return {
        ok: true,
        opened,
        url: ROOT.DOKUHA_STATUS_URL || ROOT.DOKUHA_APP_URL || ''
      };
    },
    async initState(payload) {
      return initState(isObject(payload) ? payload : {});
    },
    async initVariables(payload) {
      return initState(isObject(payload) ? payload : {});
    },
    async readState(payload) {
      return {
        ok: true,
        state: await loadState(payload && typeof payload === 'object' ? payload : {})
      };
    },
    async readContext(payload) {
      return {
        ok: true,
        context: await loadContext(payload && typeof payload === 'object' ? payload : {})
      };
    },
    async patchState(payload) {
      const patch = payload && typeof payload === 'object' ? payload : {};
      const state = await patchState((draft) => ({ ...draft, ...patch }), {
        operationId: 'state:action',
        reason: 'actionPatchState'
      });
      return { ok: true, state };
    },
    async getFamiliarityProfile(payload) {
      return {
        ok: true,
        profile: await getFamiliarityProfile(payload && typeof payload === 'object' ? payload : {})
      };
    },
    async getAffectionProfile(payload) {
      return actionHandlers.getFamiliarityProfile(payload);
    },
    async refreshStatus(payload) {
      return {
        ok: true,
        refreshed: await refreshStatus(payload?.reason || 'actionRefresh')
      };
    },
    async injectPrompt(payload) {
      const result = await promptRuntime?.injectCurrentState?.(payload || {}, {}, false);
      return {
        ok: true,
        injected: Boolean(result?.injected),
        result
      };
    },
    async clearPrompt() {
      const result = promptRuntime?.clearPromptInjection?.('actionClearPrompt') || {
        cleared: false,
        reason: 'promptRuntimeUnavailable'
      };
      return {
        ok: true,
        cleared: Boolean(result?.cleared),
        result
      };
    }
  };
  bridge.registerActions('dokuha', actionHandlers);
  cleanupCallbacks.push(() => {
    const registered = bridge.actionHandlers?.dokuha;
    if (!registered) return;
    Object.entries(actionHandlers).forEach(([key, handler]) => {
      try {
        if (registered[key] === handler) delete registered[key];
      } catch (_) {}
    });
  });

  function unload() {
    if (disposed) return;
    disposed = true;
    try { promptRuntime?.clearPromptInjection?.('pluginUnload'); } catch (_) {}
    try { statusHost?.unload?.(); } catch (_) {}
    cleanupCallbacks.splice(0).forEach((cleanup) => {
      try { cleanup(); } catch (_) {}
    });
    pluginTargets.forEach((target) => {
      try {
        if (target?.DOKUHAPlugin === pluginApi) delete target.DOKUHAPlugin;
      } catch (_) {}
      try {
        if (target?.[PLUGIN_UNLOAD_KEY] === unload) delete target[PLUGIN_UNLOAD_KEY];
      } catch (_) {}
    });
  }

  pluginApi = {
    version: '0.1.0',
    bridge,
    initState,
    initVariables: initState,
    loadState,
    loadContext,
    saveState,
    patchState,
    getFamiliarityProfile,
    getAffectionProfile,
    refreshStatus,
    async injectPrompt() {
      return promptRuntime?.injectCurrentState?.({}, {}, false) || {
        injected: false,
        reason: 'promptRuntimeUnavailable'
      };
    },
    clearPrompt() {
      return promptRuntime?.clearPromptInjection?.('manualClearPrompt') || {
        cleared: false,
        reason: 'promptRuntimeUnavailable'
      };
    },
    buildPromptPreview: promptRuntime?.buildDokuhaPrompt || null,
    openStatus() {
      return statusHost?.openStatus?.();
    },
    closeStatus() {
      return statusHost?.closeStatus?.();
    },
    debugStatus() {
      return statusHost?.debug?.();
    },
    unload,
    openDashboardUrl: ROOT.DOKUHA_STATUS_URL || UI_ROOT.DOKUHA_STATUS_URL || ROOT.DOKUHA_APP_URL || UI_ROOT.DOKUHA_APP_URL || ''
  };
  exposePlugin(pluginApi, unload, pluginTargets);
  pluginTargets.forEach((target) => {
    try { target.DOKUHA_initvar = initState; } catch (_) {}
    try { target.DOKUHAInitVar = initState; } catch (_) {}
  });
  cleanupCallbacks.push(() => {
    pluginTargets.forEach((target) => {
      try {
        if (target?.DOKUHA_initvar === initState) delete target.DOKUHA_initvar;
      } catch (_) {}
      try {
        if (target?.DOKUHAInitVar === initState) delete target.DOKUHAInitVar;
      } catch (_) {}
    });
  });

  bindPromptInjection();
  bindInitVarMacro();
  statusHost?.start?.();
  void initState({ reason: 'pluginStart' }).catch((error) => {
    console.warn('[DOKUHA InitVar] auto init failed:', error);
  });
})();
