(function() {
  "use strict";
  (function() {
    const CURRENT_ROOT = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN_UNLOAD_KEY = "__DOKUHA_PLUGIN_UNLOAD__";
    const PROMPT_TOKEN_KEY = "__DOKUHA_PROMPT_INJECTION_TOKEN__";
    function resolveBridgeHost() {
      try {
        if (CURRENT_ROOT.DOKUHA_ST_HOST) return CURRENT_ROOT.DOKUHA_ST_HOST;
      } catch (_) {
      }
      try {
        if (CURRENT_ROOT.DOKUHA_ST_HOST_ROOT?.DOKUHA_ST_HOST) return CURRENT_ROOT.DOKUHA_ST_HOST_ROOT.DOKUHA_ST_HOST;
      } catch (_) {
      }
      try {
        if (CURRENT_ROOT.parent?.DOKUHA_ST_HOST) return CURRENT_ROOT.parent.DOKUHA_ST_HOST;
      } catch (_) {
      }
      try {
        if (CURRENT_ROOT.top?.DOKUHA_ST_HOST) return CURRENT_ROOT.top.DOKUHA_ST_HOST;
      } catch (_) {
      }
      return {};
    }
    function getPluginTargets(host, root = null, uiRoot = null) {
      const targets = [];
      const pushTarget = (target) => {
        try {
          if (target && !targets.includes(target)) targets.push(target);
        } catch (_) {
        }
      };
      pushTarget(CURRENT_ROOT);
      pushTarget(host.root);
      pushTarget(host.uiRoot);
      pushTarget(host.apiRoot);
      pushTarget(root);
      pushTarget(uiRoot);
      (Array.isArray(host.candidates) ? host.candidates : []).forEach((target) => pushTarget(target));
      try {
        pushTarget(CURRENT_ROOT.parent);
      } catch (_) {
      }
      try {
        pushTarget(CURRENT_ROOT.top);
      } catch (_) {
      }
      targets.slice().forEach((target) => {
        try {
          pushTarget(target.parent);
        } catch (_) {
        }
        try {
          pushTarget(target.top);
        } catch (_) {
        }
      });
      return targets;
    }
    function unloadPreviousPlugin(targets) {
      const unloads = [];
      targets.forEach((target) => {
        try {
          const previousUnload = target?.[PLUGIN_UNLOAD_KEY];
          if (typeof previousUnload === "function" && !unloads.includes(previousUnload)) {
            unloads.push(previousUnload);
          }
        } catch (_) {
        }
      });
      unloads.forEach((previousUnload) => {
        try {
          previousUnload();
        } catch (_) {
        }
      });
    }
    function exposePlugin(api, unload2, targets) {
      targets.forEach((target) => {
        try {
          target.DOKUHAPlugin = api;
          target[PLUGIN_UNLOAD_KEY] = unload2;
        } catch (_) {
        }
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
    const stateService = typeof RUNTIME.createStateReplay === "function" ? RUNTIME.createStateReplay() : null;
    const promptRuntime = stateService && typeof RUNTIME.createPromptInjection === "function" ? RUNTIME.createPromptInjection(stateService) : null;
    const statusCacheKey = typeof bridge.host?.cacheBust === "string" && bridge.host.cacheBust.trim() ? bridge.host.cacheBust.trim() : bridge.version || "0.1.0";
    const statusHost = stateService && typeof RUNTIME.createStatusHost === "function" ? RUNTIME.createStatusHost(stateService, { version: statusCacheKey, cacheBust: statusCacheKey }) : null;
    const cleanupCallbacks = [];
    let disposed = false;
    let pluginApi = null;
    const promptToken = {};
    try {
      ROOT[PROMPT_TOKEN_KEY] = promptToken;
    } catch (_) {
    }
    cleanupCallbacks.push(() => {
      try {
        if (ROOT[PROMPT_TOKEN_KEY] === promptToken) delete ROOT[PROMPT_TOKEN_KEY];
      } catch (_) {
      }
    });
    async function loadState(options = {}) {
      return stateService ? stateService.loadState(options) : bridge.mvuz.read("dokuha", options);
    }
    async function saveState(nextState, options = {}) {
      const state = stateService ? await stateService.saveState(nextState, options) : await bridge.mvuz.write("dokuha", nextState, options);
      await refreshStatus(options.reason || "saveState");
      return state;
    }
    async function patchState(patcher, options = {}) {
      const state = stateService ? await stateService.patchState(patcher, options) : await bridge.mvuz.patch("dokuha", patcher, options);
      await refreshStatus(options.reason || "patchState");
      return state;
    }
    async function refreshStatus(reason = "refresh") {
      if (disposed) return false;
      if (!statusHost) return false;
      return statusHost.refreshStatus(reason);
    }
    function bindPromptInjection() {
      if (!promptRuntime || typeof ROOT.eventOn !== "function") return;
      const handler = (...args) => {
        if (disposed) return;
        try {
          if (ROOT[PROMPT_TOKEN_KEY] !== promptToken) return;
        } catch (_) {
        }
        promptRuntime.injectCurrentState(...args);
      };
      const stop = ROOT.eventOn("GENERATION_AFTER_COMMANDS", handler);
      if (typeof stop === "function") cleanupCallbacks.push(stop);
    }
    const actionHandlers = {
      async ping(payload) {
        return {
          ok: true,
          product: "project-dokuha",
          received: payload || {},
          at: (/* @__PURE__ */ new Date()).toISOString()
        };
      },
      async openDashboard() {
        const opened = Boolean(statusHost?.openStatus?.());
        return {
          ok: true,
          opened,
          url: ROOT.DOKUHA_STATUS_URL || ROOT.DOKUHA_APP_URL || ""
        };
      },
      async readState(payload) {
        return {
          ok: true,
          state: await loadState(payload && typeof payload === "object" ? payload : {})
        };
      },
      async patchState(payload) {
        const patch = payload && typeof payload === "object" ? payload : {};
        const state = await patchState((draft) => ({ ...draft, ...patch }), {
          operationId: "state:action",
          reason: "actionPatchState"
        });
        return { ok: true, state };
      },
      async refreshStatus(payload) {
        return {
          ok: true,
          refreshed: await refreshStatus(payload?.reason || "actionRefresh")
        };
      }
    };
    bridge.registerActions("dokuha", actionHandlers);
    cleanupCallbacks.push(() => {
      const registered = bridge.actionHandlers?.dokuha;
      if (!registered) return;
      Object.entries(actionHandlers).forEach(([key, handler]) => {
        try {
          if (registered[key] === handler) delete registered[key];
        } catch (_) {
        }
      });
    });
    function unload() {
      if (disposed) return;
      disposed = true;
      try {
        statusHost?.unload?.();
      } catch (_) {
      }
      cleanupCallbacks.splice(0).forEach((cleanup) => {
        try {
          cleanup();
        } catch (_) {
        }
      });
      pluginTargets.forEach((target) => {
        try {
          if (target?.DOKUHAPlugin === pluginApi) delete target.DOKUHAPlugin;
        } catch (_) {
        }
        try {
          if (target?.[PLUGIN_UNLOAD_KEY] === unload) delete target[PLUGIN_UNLOAD_KEY];
        } catch (_) {
        }
      });
    }
    pluginApi = {
      version: "0.1.0",
      bridge,
      loadState,
      saveState,
      patchState,
      refreshStatus,
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
      openDashboardUrl: ROOT.DOKUHA_STATUS_URL || UI_ROOT.DOKUHA_STATUS_URL || ROOT.DOKUHA_APP_URL || UI_ROOT.DOKUHA_APP_URL || ""
    };
    exposePlugin(pluginApi, unload, pluginTargets);
    bindPromptInjection();
    statusHost?.start?.();
  })();
})();
