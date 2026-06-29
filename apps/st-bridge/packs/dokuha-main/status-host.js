(function() {
  "use strict";
  (function() {
    const CURRENT_ROOT = typeof window !== "undefined" ? window : globalThis;
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
    function pushTarget(targets, target) {
      try {
        if (target && !targets.includes(target)) targets.push(target);
      } catch (_) {
      }
    }
    const BRIDGE_HOST = resolveBridgeHost();
    const ROOT = BRIDGE_HOST.apiRoot || CURRENT_ROOT.DOKUHA_ST_API_ROOT || CURRENT_ROOT.DOKUHA_ST_HOST_ROOT || CURRENT_ROOT;
    const UI_ROOT = BRIDGE_HOST.root || BRIDGE_HOST.uiRoot || CURRENT_ROOT.DOKUHA_ST_UI_ROOT || ROOT;
    const DOC = UI_ROOT.document || CURRENT_ROOT.document;
    const TIMER_ROOT = UI_ROOT.setTimeout ? UI_ROOT : CURRENT_ROOT;
    const RUNTIME = ROOT.DOKUHAMainRuntime || CURRENT_ROOT.DOKUHAMainRuntime || {};
    ROOT.DOKUHAMainRuntime = RUNTIME;
    CURRENT_ROOT.DOKUHAMainRuntime = RUNTIME;
    const HOST_ID = "dokuha-status-host";
    const TRIGGER_ID = "dokuha-status-trigger";
    const OVERLAY_ID = "dokuha-status-overlay";
    const WRAPPER_ID = "dokuha-status-wrapper";
    const IFRAME_ID = "dokuha-status-iframe";
    const CLOSE_ID = "dokuha-status-close";
    const STYLE_ID = "dokuha-status-host-style";
    const UNLOAD_KEY = "__DOKUHA_STATUS_HOST_UNLOAD__";
    const TRIGGER_COLLAPSED_CLASS = "dokuha-status-trigger-collapsed";
    const TRIGGER_COLLAPSED_STORAGE_KEY = "dokuha.status.triggerCollapsed.v2";
    const DEFAULT_APP_BASE_URL = "https://hasheeper.github.io/project-dokuha";
    const DEFAULT_STATUS_PATH = "apps/live-stream/index.html";
    const PATCHABLE_STATE_FIELDS = ["familiarity", "coreStates", "mentalStates", "outfit", "accessories", "current_location", "current_event"];
    const VALID_MODES = ["normal", "tired_mode", "hell_mode"];
    const VALID_DISORDERS = ["asd_active", "adhd_active", "bpd_active", "pmdd_active"];
    const VALID_LONG_TERM_EMOTIONS = ["depressed", "exhausted", "normal", "comfortable", "irritated", "paralyzed"];
    const VALID_DYNAMIC_EMOTIONS = ["normal", "warm", "passionate", "slightly_cold", "freezing_cold"];
    function getBridgeTargets() {
      const targets = [];
      pushTarget(targets, CURRENT_ROOT);
      pushTarget(targets, ROOT);
      pushTarget(targets, UI_ROOT);
      (Array.isArray(BRIDGE_HOST.candidates) ? BRIDGE_HOST.candidates : []).forEach((target) => pushTarget(targets, target));
      targets.slice().forEach((target) => {
        try {
          pushTarget(targets, target.parent);
        } catch (_) {
        }
        try {
          pushTarget(targets, target.top);
        } catch (_) {
        }
        try {
          pushTarget(targets, target.DOKUHA_ST_API);
        } catch (_) {
        }
      });
      return targets;
    }
    function isEnabled(value) {
      return value === true || value === "true" || value === "1" || value === 1;
    }
    function isDisabled(value) {
      return value === false || value === "false" || value === "0" || value === 0;
    }
    function isPlainObject(value) {
      return Boolean(value) && typeof value === "object" && !Array.isArray(value);
    }
    function normalizeDisorderActive(value) {
      const raw = Array.isArray(value) ? value : typeof value === "string" && value !== "none" ? value.split(/[,| ]+/) : [];
      const result = [];
      raw.forEach((item) => {
        if (typeof item !== "string") return;
        if (!VALID_DISORDERS.includes(item)) return;
        if (!result.includes(item)) result.push(item);
      });
      return result;
    }
    function trimTrailingSlash(value) {
      return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
    }
    function readGlobalString(key) {
      for (const target of getBridgeTargets()) {
        try {
          if (typeof target?.[key] === "string" && target[key].trim()) return target[key].trim();
        } catch (_) {
        }
      }
      return "";
    }
    function deriveFamiliarityProfile(state) {
      const derive = ROOT.DOKUHASchemaRuntime?.deriveFamiliarityProfile || CURRENT_ROOT.DOKUHASchemaRuntime?.deriveFamiliarityProfile || ROOT.DOKUHASchemaRuntime?.deriveAffectionProfile || CURRENT_ROOT.DOKUHASchemaRuntime?.deriveAffectionProfile;
      if (typeof derive === "function") return derive(state);
      const familiarity = isPlainObject(state?.familiarity) ? state.familiarity : {};
      const coreStates = isPlainObject(state?.coreStates) ? state.coreStates : {};
      const points = Math.max(0, Math.min(500, Math.round(Number(familiarity.points) || 0)));
      return {
        familiarityPoints: points,
        familiarityTier: points >= 250 ? "high" : points >= 100 ? "mid" : "low",
        attachmentLevel: coreStates.attachmentLevel || "non_attached",
        relationshipStage: coreStates.relationshipStage || "neighbor",
        thresholds: {
          relationship: { friend: 100, lover: 150 },
          attachment: { light_attached: 75, heavy_attached: 175 },
          tier: { mid: 100, high: 250 }
        }
      };
    }
    function appendQueryParams(url, params = {}) {
      const entries = Object.entries(params).filter(([, value]) => value !== void 0 && value !== null && value !== "");
      if (!entries.length || typeof url !== "string" || !url.trim()) return url;
      try {
        const parsed = new URL(url, /^https?:\/\//i.test(url) ? void 0 : "https://dokuha.local");
        entries.forEach(([key, value]) => parsed.searchParams.set(key, String(value)));
        return /^https?:\/\//i.test(url) ? parsed.href : `${parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch (_) {
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&")}`;
      }
    }
    function resolveStatusUrl(version) {
      const explicit = readGlobalString("DOKUHA_STATUS_URL");
      const base = trimTrailingSlash(readGlobalString("DOKUHA_APP_BASE_URL") || DEFAULT_APP_BASE_URL);
      const url = explicit || `${base}/${DEFAULT_STATUS_PATH}`;
      return appendQueryParams(url, { bridge: "st", v: version });
    }
    function ensureStyle() {
      if (!DOC?.head || DOC.getElementById(STYLE_ID)) return;
      const style = DOC.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@500;700;900&display=swap');

      @keyframes dokuhaStatusFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }

      @keyframes dokuhaStatusPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(223, 69, 118, 0.22), 0 14px 28px rgba(0, 0, 0, 0.42); }
        50% { box-shadow: 0 0 0 10px rgba(223, 69, 118, 0), 0 18px 34px rgba(0, 0, 0, 0.5); }
      }

      #${HOST_ID} {
        position: static !important;
        z-index: 2147483645 !important;
        pointer-events: none !important;
        --dokuha-bg: rgba(18, 14, 20, 0.92);
        --dokuha-panel: rgba(22, 18, 25, 0.92);
        --dokuha-panel-weak: rgba(28, 23, 31, 0.78);
        --dokuha-border: rgba(83, 70, 90, 0.72);
        --dokuha-pink: #df4576;
        --dokuha-pink-hot: #ff5b93;
        --dokuha-text: #f8f6f7;
        --dokuha-muted: #8b8390;
        --dokuha-shadow: rgba(0, 0, 0, 0.5);
      }

      #${TRIGGER_ID} {
        position: fixed !important;
        top: 80px !important;
        right: 20px !important;
        width: 68px;
        height: 68px;
        background:
          linear-gradient(145deg, rgba(223, 69, 118, 0.16), transparent 58%),
          var(--dokuha-panel);
        border: 1.5px solid rgba(223, 69, 118, 0.42);
        border-radius: 18px;
        color: var(--dokuha-text);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        overflow: visible;
        z-index: 2147483645 !important;
        pointer-events: auto !important;
        box-shadow: 0 14px 28px var(--dokuha-shadow), inset 0 0 0 1px rgba(255, 255, 255, 0.03);
        animation: dokuhaStatusFloat 3.5s ease-in-out infinite, dokuhaStatusPulse 3.5s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
        font-family: "Nunito", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: transform 0.22s ease, border-color 0.22s ease, background 0.22s ease, box-shadow 0.22s ease;
      }

      #${TRIGGER_ID}::before {
        display: none;
      }

      #${TRIGGER_ID}:hover {
        transform: scale(1.06);
        border-color: rgba(255, 91, 147, 0.82);
        background:
          linear-gradient(145deg, rgba(223, 69, 118, 0.22), transparent 58%),
          var(--dokuha-bg);
        box-shadow: 0 18px 34px rgba(0, 0, 0, 0.56), 0 0 16px rgba(223, 69, 118, 0.22);
      }

      #${TRIGGER_ID} .dokuha-status-trigger-mark {
        display: grid;
        place-items: center;
        width: 52px;
        height: 52px;
        border-radius: 12px;
        background: rgba(26, 22, 30, 0.92);
        border: 1px dashed rgba(223, 69, 118, 0.42);
        transition: transform 0.25s ease;
      }

      #${TRIGGER_ID}:hover .dokuha-status-trigger-mark {
        transform: scale(1.04);
      }

      #${TRIGGER_ID} .dokuha-status-trigger-main {
        font-weight: 900;
        font-size: 11px;
        line-height: 1.1;
        letter-spacing: 1px;
        color: var(--dokuha-text);
        text-align: center;
        text-shadow: 0 0 12px rgba(223, 69, 118, 0.22);
      }

      #${TRIGGER_ID} .dokuha-status-trigger-sub {
        display: block;
        margin-top: 2px;
        font-size: 8px;
        color: var(--dokuha-muted);
        letter-spacing: 1.5px;
      }

      #${TRIGGER_ID} .dokuha-status-trigger-mini {
        display: none;
      }

      .dokuha-status-trigger-fold {
        position: absolute;
        right: -6px;
        bottom: -6px;
        appearance: none;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        background: var(--dokuha-pink);
        border: 2px solid rgba(248, 246, 247, 0.82);
        border-radius: 50%;
        color: #ffffff;
        cursor: pointer;
        padding: 0;
        z-index: 2;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.42), 0 0 10px rgba(223, 69, 118, 0.34);
        transition: transform 0.2s ease, background 0.2s ease;
      }

      .dokuha-status-trigger-fold:hover {
        transform: translateY(-1px) scale(1.05);
        background: var(--dokuha-pink-hot);
      }

      .dokuha-status-trigger-fold svg {
        width: 14px;
        height: 14px;
        transform: translateX(0.5px);
      }

      .dokuha-status-trigger-fold-open {
        display: none;
      }

      #${TRIGGER_ID}.${TRIGGER_COLLAPSED_CLASS} {
        right: 0 !important;
        width: 26px;
        height: 56px;
        border-radius: 12px 0 0 12px;
        background: var(--dokuha-panel);
        border: 1.5px solid rgba(223, 69, 118, 0.42);
        border-right: none;
        opacity: 1;
        animation: none;
        box-shadow: -6px 8px 18px rgba(0, 0, 0, 0.4);
      }

      #${TRIGGER_ID}.${TRIGGER_COLLAPSED_CLASS}::before {
        display: none;
      }

      #${TRIGGER_ID}.${TRIGGER_COLLAPSED_CLASS}:hover {
        transform: none;
        background: var(--dokuha-bg);
        border-color: rgba(255, 91, 147, 0.84);
      }

      #${TRIGGER_ID}.${TRIGGER_COLLAPSED_CLASS} .dokuha-status-trigger-mark {
        width: 100%;
        height: 100%;
        border-radius: 0;
        background: transparent;
        border: none;
        transform: translateY(-8px);
      }

      #${TRIGGER_ID}.${TRIGGER_COLLAPSED_CLASS}:hover .dokuha-status-trigger-mark {
        transform: translateY(-8px);
      }

      #${TRIGGER_ID}.${TRIGGER_COLLAPSED_CLASS} .dokuha-status-trigger-main {
        display: none;
      }

      #${TRIGGER_ID}.${TRIGGER_COLLAPSED_CLASS} .dokuha-status-trigger-mini {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
      }

      #${TRIGGER_ID}.${TRIGGER_COLLAPSED_CLASS} .dokuha-status-trigger-mini svg {
        width: 16px;
        height: 16px;
        margin-left: 2px;
      }

      #${TRIGGER_ID}.${TRIGGER_COLLAPSED_CLASS} .dokuha-status-trigger-fold {
        right: 1.5px;
        bottom: 2px;
        width: 20px;
        height: 20px;
        border-width: 1.5px;
        box-shadow: none;
      }

      #${TRIGGER_ID}.${TRIGGER_COLLAPSED_CLASS} .dokuha-status-trigger-fold svg {
        width: 12px;
        height: 12px;
        transform: translateX(-0.5px);
      }

      #${TRIGGER_ID}.${TRIGGER_COLLAPSED_CLASS} .dokuha-status-trigger-fold-close {
        display: none;
      }

      #${TRIGGER_ID}.${TRIGGER_COLLAPSED_CLASS} .dokuha-status-trigger-fold-open {
        display: block;
      }

      #${OVERLAY_ID} {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        box-sizing: border-box;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background:
          radial-gradient(circle at 50% 42%, rgba(223, 69, 118, 0.12), transparent 34%),
          linear-gradient(180deg, rgba(18, 14, 20, 0.54), rgba(9, 7, 10, 0.72));
        backdrop-filter: blur(6px) saturate(0.9);
        -webkit-backdrop-filter: blur(6px) saturate(0.9);
        z-index: 2147483646 !important;
        overflow: visible;
        pointer-events: auto !important;
      }

      #${WRAPPER_ID} {
        position: relative;
        box-sizing: border-box;
        width: min(620px, calc(100vw - 12px));
        height: min(940px, calc(100vh - 36px));
        min-height: min(680px, calc(100vh - 36px));
        overflow: visible;
      }

      #${IFRAME_ID} {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
        background: transparent;
        pointer-events: auto;
        border-radius: 0;
        overflow: visible;
        box-shadow: none;
      }

      #${CLOSE_ID} {
        position: absolute;
        top: 14px;
        left: auto;
        right: max(4px, calc((100% - 430px) / 2 - 22px));
        width: 42px;
        height: 42px;
        border-radius: 999px;
        border: 0;
        background: rgba(41, 36, 45, 0.84);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        z-index: 5;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: transform 0.2s ease, background 0.2s ease;
      }

      #${CLOSE_ID}:hover {
        transform: scale(1.08);
        background: rgba(228, 124, 154, 0.94);
      }
    `;
      DOC.head.append(style);
    }
    RUNTIME.createStatusHost = function createStatusHost(stateService, config = {}) {
      let frame = null;
      let host = null;
      let overlay = null;
      let wrapper = null;
      let ready = false;
      let iframeInitialized = false;
      let disposed = false;
      let trigger = null;
      let triggerFoldButton = null;
      let lastState = null;
      let lastSystem = null;
      let lastReason = "";
      let frameReadOptions = { persist: false };
      let eventsBound = false;
      const inlineTargets = /* @__PURE__ */ new Map();
      const targetStates = /* @__PURE__ */ new Map();
      const targetSystems = /* @__PURE__ */ new Map();
      const messageTargets = [];
      const timeoutHandles = /* @__PURE__ */ new Set();
      const cleanupCallbacks = [];
      const version = config.cacheBust || config.version || "0.1.0";
      const injectStatusHost = !isDisabled(config.injectFixedStatus) && !isEnabled(config.disableStatusHost) && !isEnabled(ROOT.DOKUHA_DISABLE_STATUS_HOST) && !isEnabled(UI_ROOT.DOKUHA_DISABLE_STATUS_HOST);
      function schedule(callback, delayMs = 0) {
        const handle = TIMER_ROOT.setTimeout(() => {
          timeoutHandles.delete(handle);
          if (disposed) return;
          callback();
        }, delayMs);
        timeoutHandles.add(handle);
        return handle;
      }
      function clearScheduledWork() {
        timeoutHandles.forEach((handle) => {
          try {
            TIMER_ROOT.clearTimeout?.(handle);
          } catch (_) {
          }
          try {
            CURRENT_ROOT.clearTimeout?.(handle);
          } catch (_) {
          }
        });
        timeoutHandles.clear();
      }
      function waitForBodyAvailable(callback) {
        if (disposed) return;
        if (DOC?.body) {
          callback();
          return;
        }
        schedule(() => waitForBodyAvailable(callback), 100);
      }
      function blankIframe(targetFrame) {
        try {
          if (targetFrame && targetFrame.src !== "about:blank") targetFrame.src = "about:blank";
        } catch (_) {
        }
      }
      function removeExistingDom(removeStyle = true) {
        blankIframe(frame);
        try {
          blankIframe(DOC?.getElementById(IFRAME_ID));
        } catch (_) {
        }
        try {
          DOC?.getElementById(HOST_ID)?.remove();
        } catch (_) {
        }
        try {
          DOC?.getElementById(OVERLAY_ID)?.remove();
        } catch (_) {
        }
        if (removeStyle) {
          try {
            DOC?.getElementById(STYLE_ID)?.remove();
          } catch (_) {
          }
        }
      }
      function unloadPreviousInstances() {
        const unloads = [];
        getBridgeTargets().forEach((target) => {
          try {
            const previousUnload = target?.[UNLOAD_KEY];
            if (typeof previousUnload === "function" && previousUnload !== unload && !unloads.includes(previousUnload)) {
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
      function exposeUnload() {
        getBridgeTargets().forEach((target) => {
          try {
            target[UNLOAD_KEY] = unload;
          } catch (_) {
          }
        });
      }
      function clearUnloadExposure() {
        getBridgeTargets().forEach((target) => {
          try {
            if (target?.[UNLOAD_KEY] === unload) delete target[UNLOAD_KEY];
          } catch (_) {
          }
        });
      }
      function bindLifecycleUnload(target) {
        if (!target || typeof target.addEventListener !== "function") return;
        ["pagehide", "beforeunload"].forEach((eventName) => {
          try {
            target.removeEventListener(eventName, unload);
            target.addEventListener(eventName, unload);
            cleanupCallbacks.push(() => target.removeEventListener(eventName, unload));
          } catch (_) {
          }
        });
      }
      function ensureHost() {
        if (disposed) return null;
        if (!disposed && host && overlay && frame && DOC?.body?.contains(host) && DOC?.body?.contains(overlay)) return host;
        if (!DOC?.body) return null;
        ensureStyle();
        removeExistingDom(false);
        host = DOC.createElement("div");
        host.id = HOST_ID;
        trigger = DOC.createElement("div");
        trigger.id = TRIGGER_ID;
        trigger.setAttribute("role", "button");
        trigger.tabIndex = 0;
        trigger.title = "Open DOKUHA Status";
        trigger.setAttribute("aria-label", "Open DOKUHA Status");
        trigger.innerHTML = [
          '<span class="dokuha-status-trigger-mark" aria-hidden="true">',
          '<span class="dokuha-status-trigger-main">DOKUHA<span class="dokuha-status-trigger-sub">STATUS</span></span>',
          '<span class="dokuha-status-trigger-mini">',
          '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">',
          '<path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z" stroke="var(--dokuha-pink)" stroke-width="2.4" stroke-linejoin="round"/>',
          '<path d="M13 5.5 8 12.5h5.4l-.6 4.5 4.9-6.5h-5L13 5.5Z" fill="var(--dokuha-pink)"/>',
          "</svg>",
          "</span>",
          "</span>",
          '<button class="dokuha-status-trigger-fold" type="button" title="收起悬浮球" aria-label="收起悬浮球">',
          '<svg class="dokuha-status-trigger-fold-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
          '<path d="m9 18 6-6-6-6" />',
          "</svg>",
          '<svg class="dokuha-status-trigger-fold-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
          '<path d="m15 18-6-6 6-6" />',
          "</svg>",
          "</button>"
        ].join("");
        trigger.addEventListener("click", openStatus);
        trigger.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          openStatus();
        });
        triggerFoldButton = trigger.querySelector(".dokuha-status-trigger-fold");
        triggerFoldButton?.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          setTriggerCollapsed(!trigger.classList.contains(TRIGGER_COLLAPSED_CLASS));
        });
        overlay = DOC.createElement("div");
        overlay.id = OVERLAY_ID;
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-label", "DOKUHA Status");
        overlay.addEventListener("click", (event) => {
          if (event.target === overlay) closeStatus();
        });
        wrapper = DOC.createElement("div");
        wrapper.id = WRAPPER_ID;
        frame = DOC.createElement("iframe");
        frame.id = IFRAME_ID;
        frame.title = "DOKUHA Status";
        frame.allow = "fullscreen";
        frame.referrerPolicy = "no-referrer";
        frame.setAttribute("sandbox", "allow-scripts allow-forms allow-modals allow-popups allow-same-origin");
        frame.dataset.dokuhaSrc = resolveStatusUrl(version);
        frame.addEventListener("load", () => {
          if (disposed) return;
          ready = true;
          postContainerReady();
          schedule(() => refreshStatus(lastReason || "iframeLoad"), 40);
        });
        const close = DOC.createElement("button");
        close.id = CLOSE_ID;
        close.type = "button";
        close.title = "Close DOKUHA Status";
        close.setAttribute("aria-label", "Close DOKUHA Status");
        close.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>';
        close.addEventListener("click", closeStatus);
        host.replaceChildren(trigger);
        wrapper.replaceChildren(frame, close);
        overlay.replaceChildren(wrapper);
        DOC.body.append(host, overlay);
        restoreTriggerCollapsed();
        console.info("[DOKUHA Status Host] floating trigger injected into ST host:", {
          url: frame.dataset.dokuhaSrc,
          uiRoot: UI_ROOT === CURRENT_ROOT ? "current" : "host"
        });
        return host;
      }
      function setTriggerCollapsed(collapsed) {
        if (!trigger) return;
        trigger.classList.toggle(TRIGGER_COLLAPSED_CLASS, Boolean(collapsed));
        trigger.title = collapsed ? "DOKUHA Status（点击打开，箭头展开）" : "Open DOKUHA Status";
        trigger.setAttribute("aria-label", collapsed ? "Open DOKUHA Status, collapsed" : "Open DOKUHA Status");
        if (triggerFoldButton) {
          triggerFoldButton.title = collapsed ? "展开悬浮球" : "收起悬浮球";
          triggerFoldButton.setAttribute("aria-label", collapsed ? "展开悬浮球" : "收起悬浮球");
        }
        try {
          UI_ROOT.localStorage?.setItem(TRIGGER_COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
        } catch (_) {
        }
      }
      function restoreTriggerCollapsed() {
        let collapsed = false;
        try {
          collapsed = UI_ROOT.localStorage?.getItem(TRIGGER_COLLAPSED_STORAGE_KEY) === "1";
        } catch (_) {
        }
        setTriggerCollapsed(collapsed);
      }
      function initializeIframe() {
        if (disposed) return;
        if (!frame) ensureHost();
        if (!frame || iframeInitialized) return;
        iframeInitialized = true;
        frame.src = frame.dataset.dokuhaSrc || resolveStatusUrl(version);
      }
      function openStatus() {
        if (disposed) return false;
        ensureHost();
        if (!overlay) return false;
        overlay.style.display = "flex";
        initializeIframe();
        schedule(() => refreshStatus("open"), 80);
        return true;
      }
      function closeStatus() {
        if (disposed) return false;
        if (overlay) overlay.style.display = "none";
        return Boolean(overlay);
      }
      function isMessageTarget(value) {
        return Boolean(value && typeof value.postMessage === "function");
      }
      function resolveReadOptions() {
        return { persist: false };
      }
      function sanitizeStatePatch(value) {
        const source = isPlainObject(value) ? value : {};
        const patch = {};
        PATCHABLE_STATE_FIELDS.forEach((field) => {
          if (!(field in source)) return;
          const next = source[field];
          if (field === "familiarity") {
            if (!isPlainObject(next)) return;
            const points = Number(next.points);
            if (Number.isFinite(points)) patch[field] = { points };
            return;
          }
          if (field === "coreStates") {
            if (!isPlainObject(next)) return;
            const corePatch = {};
            if (VALID_MODES.includes(next.mode)) corePatch.mode = next.mode;
            if (next.relationshipStage === "neighbor" || next.relationshipStage === "friend" || next.relationshipStage === "lover") corePatch.relationshipStage = next.relationshipStage;
            if (next.attachmentLevel === "non_attached" || next.attachmentLevel === "light_attached" || next.attachmentLevel === "heavy_attached") corePatch.attachmentLevel = next.attachmentLevel;
            if (Object.keys(corePatch).length) patch[field] = corePatch;
            return;
          }
          if (field === "mentalStates") {
            if (!isPlainObject(next)) return;
            const mentalPatch = {};
            if ("disorderActive" in next) mentalPatch.disorderActive = normalizeDisorderActive(next.disorderActive);
            if (VALID_LONG_TERM_EMOTIONS.includes(next.longTermEmotion)) mentalPatch.longTermEmotion = next.longTermEmotion;
            if (VALID_DYNAMIC_EMOTIONS.includes(next.dynamicEmotion)) mentalPatch.dynamicEmotion = next.dynamicEmotion;
            if (Object.keys(mentalPatch).length) patch[field] = mentalPatch;
            return;
          }
          if (field === "accessories") {
            if (Array.isArray(next)) patch[field] = next.filter((item) => typeof item === "string");
            else if (typeof next === "string") patch[field] = next;
            return;
          }
          if (field === "current_event") {
            if (!isPlainObject(next)) return;
            const eventPatch = {};
            if (["none", "daily_event", "relationship_event", "dokuha_crisis_event", "pmdd_event", "bad_luck"].includes(next.type)) eventPatch.type = next.type;
            if (typeof next.name === "string") eventPatch.name = next.name;
            if (["none", "ongoing", "end"].includes(next.phase)) eventPatch.phase = next.phase;
            if (typeof next.start_time === "string") eventPatch.start_time = next.start_time;
            if (Object.keys(eventPatch).length) patch[field] = eventPatch;
            return;
          }
          if (typeof next === "string") patch[field] = next;
        });
        return patch;
      }
      function postPatchResult(target, request, result) {
        if (!isMessageTarget(target)) return false;
        try {
          target.postMessage({
            type: "DOKUHA_STATE_PATCH_RESULT",
            appId: "live-stream",
            requestId: request?.requestId || "",
            ok: Boolean(result?.ok),
            error: result?.error || "",
            state: result?.state || null,
            familiarityProfile: result?.state ? deriveFamiliarityProfile(result.state) : null,
            affectionProfile: result?.state ? deriveFamiliarityProfile(result.state) : null
          }, "*");
          return true;
        } catch (_) {
          return false;
        }
      }
      function mergeStatePatch(draft, patch) {
        const base = isPlainObject(draft) ? draft : {};
        const next = { ...base, ...patch };
        if (isPlainObject(patch.familiarity)) {
          next.familiarity = {
            ...isPlainObject(base.familiarity) ? base.familiarity : {},
            ...patch.familiarity
          };
        }
        if (isPlainObject(patch.coreStates)) {
          next.coreStates = {
            ...isPlainObject(base.coreStates) ? base.coreStates : {},
            ...patch.coreStates
          };
        }
        if (isPlainObject(patch.mentalStates)) {
          next.mentalStates = {
            ...isPlainObject(base.mentalStates) ? base.mentalStates : {},
            ...patch.mentalStates
          };
        }
        if (isPlainObject(patch.current_event)) {
          next.current_event = {
            ...isPlainObject(base.current_event) ? base.current_event : {},
            ...patch.current_event
          };
        }
        return next;
      }
      async function patchStateFromMessage(target, request) {
        const patch = sanitizeStatePatch(request?.patch);
        if (!Object.keys(patch).length) {
          postPatchResult(target, request, { ok: false, error: "empty_or_invalid_patch" });
          return false;
        }
        try {
          let state = null;
          if (typeof ROOT.STBridge?.mvuz?.patch === "function") {
            state = await ROOT.STBridge.mvuz.patch("dokuha", (draft) => mergeStatePatch(draft, patch), { type: "message", reason: request?.reason || "statusPatch" });
            try {
              stateService?.notifyStateChanged?.(state);
            } catch (_) {
            }
          } else if (typeof stateService?.patchState === "function") {
            state = await stateService.patchState((draft) => mergeStatePatch(draft, patch), {
              operationId: "state:status-ui",
              reason: request?.reason || "statusPatch"
            });
          } else {
            throw new Error("patch_api_unavailable");
          }
          lastState = state;
          lastReason = request?.reason || "statusPatch";
          targetStates.set(target, state);
          postPatchResult(target, request, { ok: true, state });
          postDirectState(target, lastReason, state);
          void refreshStatus(lastReason);
          return true;
        } catch (error) {
          const message = error && typeof error.message === "string" ? error.message : "patch_failed";
          console.warn("[DOKUHA Status Host] patchState failed:", error);
          postPatchResult(target, request, { ok: false, error: message });
          return false;
        }
      }
      function registerInlineTarget(source, readOptions = {}) {
        if (!isMessageTarget(source)) return null;
        inlineTargets.set(source, readOptions);
        return source;
      }
      function postContainerReadyTo(target) {
        if (!isMessageTarget(target)) return false;
        try {
          target.postMessage({
            type: "dokuha:container-ready",
            appId: "live-stream",
            app: {
              id: "live-stream",
              name: "SillyTavern DOKUHA Status",
              type: "status",
              status: "active"
            }
          }, "*");
          return true;
        } catch (_) {
          return false;
        }
      }
      function postContainerReady(target = frame?.contentWindow) {
        return postContainerReadyTo(target);
      }
      function readOptionsForTarget(target) {
        if (target === frame?.contentWindow) return frameReadOptions;
        return inlineTargets.get(target) || { persist: false };
      }
      async function loadStatusContext(readOptions = {}) {
        if (typeof stateService?.loadContext === "function") {
          const context = await stateService.loadContext(readOptions || { persist: false });
          return {
            state: context?.dokuha || context?.state || null,
            system: context?.system || null
          };
        }
        return {
          state: await stateService.loadState(readOptions || { persist: false }),
          system: null
        };
      }
      function postStateTo(target, reason, state, system = null) {
        if (disposed) return false;
        const nextState = state || lastState;
        const nextSystem = system || lastSystem;
        if (!isMessageTarget(target) || !nextState) return false;
        try {
          target.postMessage({
            type: "DOKUHA_STATE_PUSH",
            reason: reason || "refresh",
            floorKey: "",
            state: nextState,
            system: nextSystem,
            familiarityProfile: deriveFamiliarityProfile(nextState),
            affectionProfile: deriveFamiliarityProfile(nextState)
          }, "*");
          return true;
        } catch (_) {
          inlineTargets.delete(target);
          targetStates.delete(target);
          return false;
        }
      }
      function postState(reason, state) {
        const nextState = state || lastState;
        if (!nextState) return false;
        let sent = false;
        if (frame?.contentWindow && ready) {
          postContainerReady(frame.contentWindow);
          sent = postStateTo(frame.contentWindow, reason, nextState, lastSystem) || sent;
        }
        inlineTargets.forEach((_, target) => {
          postContainerReadyTo(target);
          const cachedState = targetStates.get(target);
          const cachedSystem = targetSystems.get(target) || lastSystem;
          if (cachedState) sent = postStateTo(target, reason, cachedState, cachedSystem) || sent;
        });
        return sent;
      }
      function postDirectState(target, reason, state, system = null) {
        postContainerReadyTo(target);
        return postStateTo(target, reason, state, system);
      }
      async function refreshTarget(target, reason = "statusRequest", readOptions = readOptionsForTarget(target)) {
        if (disposed) return false;
        if (!isMessageTarget(target)) return false;
        let context;
        try {
          context = await loadStatusContext(readOptions || { persist: false });
        } catch (error) {
          console.warn("[DOKUHA Status Host] loadState failed:", error);
          return false;
        }
        const state = context.state;
        const system = context.system;
        lastState = state;
        lastSystem = system || lastSystem;
        lastReason = reason;
        targetStates.set(target, state);
        if (system) targetSystems.set(target, system);
        return postDirectState(target, reason, state, system);
      }
      async function refreshStatus(reason = "refresh") {
        if (disposed) return false;
        if (injectStatusHost) waitForBodyAvailable(() => ensureHost());
        let sent = false;
        if (frame?.contentWindow && ready) {
          try {
            frameReadOptions = resolveReadOptions();
            const context = await loadStatusContext(frameReadOptions);
            const state = context.state;
            const system = context.system;
            lastState = state;
            lastSystem = system || lastSystem;
            lastReason = reason;
            sent = postState(reason, state) || sent;
          } catch (error) {
            console.warn("[DOKUHA Status Host] loadState failed:", error);
          }
        }
        const results = await Promise.all(Array.from(inlineTargets.entries()).map(([target, readOptions]) => {
          return refreshTarget(target, reason, readOptions);
        }));
        return results.some(Boolean) || sent;
      }
      function handleMessage(event) {
        if (disposed) return;
        const data = event?.data;
        if (!data || typeof data !== "object") return;
        const isReady = data.type === "DOKUHA_STATUS_READY" || data.type === "dokuha:app-ready";
        const isRequest = data.type === "DOKUHA_STATUS_REQUEST";
        const isPatch = data.type === "DOKUHA_STATE_PATCH";
        if (!isReady && !isRequest && !isPatch) return;
        const appId = typeof data.appId === "string" ? data.appId : data.app?.id;
        if (appId && appId !== "live-stream") return;
        if (isPatch) {
          if (event.source === frame?.contentWindow) {
            ready = true;
            postContainerReady();
            void patchStateFromMessage(event.source, data);
            return;
          }
          const readOptions2 = resolveReadOptions();
          const target2 = registerInlineTarget(event.source, readOptions2);
          if (!target2) return;
          void patchStateFromMessage(target2, data);
          return;
        }
        if (event.source === frame?.contentWindow) {
          ready = true;
          postContainerReady();
          void refreshStatus(data.reason || (isRequest ? "statusRequest" : "appReady"));
          return;
        }
        const readOptions = resolveReadOptions();
        const target = registerInlineTarget(event.source, readOptions);
        if (!target) return;
        if (targetStates.has(target)) postDirectState(target, isRequest ? "statusRequest" : "appReady", targetStates.get(target));
        void refreshTarget(target, data.reason || (isRequest ? "statusRequest" : "appReady"), readOptions);
      }
      function bindWindowMessageTargets() {
        getBridgeTargets().forEach((target) => {
          if (!target || messageTargets.includes(target)) return;
          try {
            target.removeEventListener?.("message", handleMessage);
            target.addEventListener?.("message", handleMessage);
            messageTargets.push(target);
          } catch (_) {
          }
        });
      }
      function bindDokuhaEvent(target, eventName, handler) {
        try {
          target?.removeEventListener?.(eventName, handler);
          target?.addEventListener?.(eventName, handler);
          cleanupCallbacks.push(() => target.removeEventListener?.(eventName, handler));
        } catch (_) {
        }
      }
      function bindSillyTavernEvent(target, eventName, reason, delayMs = 0) {
        if (typeof target?.eventOn !== "function") return;
        try {
          const stop = target.eventOn(eventName, () => {
            if (delayMs > 0) {
              schedule(() => refreshStatus(reason), delayMs);
              return;
            }
            void refreshStatus(reason);
          });
          if (typeof stop === "function") cleanupCallbacks.push(stop);
        } catch (_) {
        }
      }
      function bindEvents() {
        if (eventsBound) return;
        eventsBound = true;
        bindWindowMessageTargets();
        const keydownHandler = (event) => {
          if (event?.key === "Escape" && overlay?.style?.display !== "none") closeStatus();
        };
        try {
          DOC?.removeEventListener?.("keydown", keydownHandler);
          DOC?.addEventListener?.("keydown", keydownHandler);
          cleanupCallbacks.push(() => DOC?.removeEventListener?.("keydown", keydownHandler));
        } catch (_) {
        }
        const stateChangedHandler = () => refreshStatus("stateChanged");
        const mvuzWrittenHandler = () => refreshStatus("mvuzWritten");
        getBridgeTargets().forEach((target) => {
          bindDokuhaEvent(target, "dokuha:stateChanged", stateChangedHandler);
          bindDokuhaEvent(target, "dokuha:mvuz-written", mvuzWrittenHandler);
        });
        getBridgeTargets().forEach((target) => {
          bindLifecycleUnload(target);
          bindSillyTavernEvent(target, "message_received", "messageReceived", 1200);
          bindSillyTavernEvent(target, "character_message_rendered", "messageRendered", 250);
          bindSillyTavernEvent(target, "message_updated", "messageUpdated", 400);
          bindSillyTavernEvent(target, "generation_ended", "generationEnded", 300);
          bindSillyTavernEvent(target, "CHAT_CHANGED", "chatChanged", 250);
          bindSillyTavernEvent(target, "chat_changed", "chatChanged", 250);
        });
      }
      function unload() {
        disposed = true;
        ready = false;
        iframeInitialized = false;
        clearScheduledWork();
        cleanupCallbacks.splice(0).forEach((cleanup) => {
          try {
            cleanup();
          } catch (_) {
          }
        });
        messageTargets.splice(0).forEach((target) => {
          try {
            target.removeEventListener?.("message", handleMessage);
          } catch (_) {
          }
        });
        inlineTargets.clear();
        targetStates.clear();
        targetSystems.clear();
        blankIframe(frame);
        removeExistingDom();
        host = null;
        overlay = null;
        wrapper = null;
        frame = null;
        trigger = null;
        triggerFoldButton = null;
        lastState = null;
        lastSystem = null;
        lastReason = "";
        eventsBound = false;
        clearUnloadExposure();
      }
      function start() {
        unloadPreviousInstances();
        disposed = false;
        exposeUnload();
        bindEvents();
        if (injectStatusHost) {
          waitForBodyAvailable(() => {
            ensureHost();
            void refreshStatus("start");
          });
        }
      }
      function debug() {
        return {
          disposed,
          ready,
          iframeInitialized,
          injected: Boolean(DOC?.getElementById(TRIGGER_ID)),
          open: overlay?.style?.display || "",
          statusUrl: frame?.dataset?.dokuhaSrc || "",
          scheduledWork: timeoutHandles.size,
          collapsed: Boolean(trigger?.classList?.contains(TRIGGER_COLLAPSED_CLASS)),
          hostRoot: UI_ROOT === CURRENT_ROOT ? "current" : "host",
          apiRoot: ROOT === CURRENT_ROOT ? "current" : "host"
        };
      }
      return {
        start,
        unload,
        refreshStatus,
        ensureHost,
        openStatus,
        closeStatus,
        debug
      };
    };
  })();
})();
