/**
 * DOKUHA prompt injection runtime.
 */
import { DOKUHA_STREAM_STATUS_LABELS } from '../../shared/dokuha';

(function () {
  'use strict';

  const CURRENT_ROOT = typeof window !== 'undefined' ? window : globalThis;

  function resolveBridgeHost() {
    try { if (CURRENT_ROOT.DOKUHA_ST_HOST) return CURRENT_ROOT.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.DOKUHA_ST_HOST_ROOT?.DOKUHA_ST_HOST) return CURRENT_ROOT.DOKUHA_ST_HOST_ROOT.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.parent?.DOKUHA_ST_HOST) return CURRENT_ROOT.parent.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.top?.DOKUHA_ST_HOST) return CURRENT_ROOT.top.DOKUHA_ST_HOST; } catch (_) {}
    return {};
  }

  const BRIDGE_HOST = resolveBridgeHost();
  const ROOT = BRIDGE_HOST.apiRoot || CURRENT_ROOT.DOKUHA_ST_API_ROOT || CURRENT_ROOT.DOKUHA_ST_HOST_ROOT || CURRENT_ROOT;
  const RUNTIME = ROOT.DOKUHAMainRuntime || CURRENT_ROOT.DOKUHAMainRuntime || {};
  ROOT.DOKUHAMainRuntime = RUNTIME;
  CURRENT_ROOT.DOKUHAMainRuntime = RUNTIME;

  const INJECT_ID = 'dokuha_status_context';

  function getStreamStatusLabel(streamStatus) {
    return DOKUHA_STREAM_STATUS_LABELS[streamStatus] || DOKUHA_STREAM_STATUS_LABELS.online;
  }

  function buildDokuhaPrompt(state) {
    const statusLabel = getStreamStatusLabel(state.streamStatus);
    return `<dokuha_status>
affection: ${state.affection}/255
streamStatus: ${state.streamStatus}(${statusLabel})
energy: ${state.energy}/100
mood: ${state.mood}/100
location: ${state.location}
nowPlaying: ${state.nowPlaying}
hostName: ${state.hostName}
handle: ${state.handle}
statusComment: ${state.statusComment}
</dokuha_status>`;
  }

  function isDryRun(args) {
    if (args.length >= 3) return args[2] === true;
    const detail = args[0];
    return Boolean(detail && typeof detail === 'object' && detail.dryRun === true);
  }

  RUNTIME.createPromptInjection = function createPromptInjection(stateService) {
    async function injectCurrentState(...args) {
      if (isDryRun(args)) return false;
      if (typeof ROOT.injectPrompts !== 'function') return false;

      let state;
      try {
        state = await stateService.loadState({ persist: false });
      } catch (error) {
        console.warn('[DOKUHA Prompt] loadState failed:', error);
        return false;
      }

      const content = buildDokuhaPrompt(state);
      try {
        if (typeof ROOT.uninjectPrompts === 'function') ROOT.uninjectPrompts([INJECT_ID]);
      } catch (_) {}
      ROOT.injectPrompts([{
        id: INJECT_ID,
        position: 'in_chat',
        depth: 2,
        role: 'system',
        should_scan: false,
        content
      }]);
      return true;
    }

    return {
      INJECT_ID,
      buildDokuhaPrompt,
      injectCurrentState
    };
  };
})();
