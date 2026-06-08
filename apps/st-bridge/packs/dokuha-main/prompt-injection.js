(function() {
  "use strict";
  const DOKUHA_STREAM_STATUS_LABELS = {
    offline: "离线",
    online: "直播中",
    brb: "暂离",
    ending: "收尾"
  };
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
    const BRIDGE_HOST = resolveBridgeHost();
    const ROOT = BRIDGE_HOST.apiRoot || CURRENT_ROOT.DOKUHA_ST_API_ROOT || CURRENT_ROOT.DOKUHA_ST_HOST_ROOT || CURRENT_ROOT;
    const RUNTIME = ROOT.DOKUHAMainRuntime || CURRENT_ROOT.DOKUHAMainRuntime || {};
    ROOT.DOKUHAMainRuntime = RUNTIME;
    CURRENT_ROOT.DOKUHAMainRuntime = RUNTIME;
    const INJECT_ID = "dokuha_status_context";
    function getStreamStatusLabel(streamStatus) {
      return DOKUHA_STREAM_STATUS_LABELS[streamStatus] || DOKUHA_STREAM_STATUS_LABELS.online;
    }
    function deriveAffectionProfile(state) {
      const derive = ROOT.DOKUHASchemaRuntime?.deriveAffectionProfile;
      if (typeof derive === "function") return derive(state);
      const affection = Math.max(0, Math.min(255, Math.round(Number(state?.affection) || 0)));
      return {
        affection,
        affectionTier: affection >= 200 ? "high" : affection >= 80 ? "mid" : "low",
        attachmentLevel: affection >= 140 ? "heavy_attached" : affection >= 60 ? "light_attached" : "non_attached",
        relationshipStage: affection >= 120 ? "lover" : affection >= 80 ? "friend" : "neighbor"
      };
    }
    function buildDokuhaPrompt(state) {
      const statusLabel = getStreamStatusLabel(state.streamStatus);
      const affectionProfile = deriveAffectionProfile(state);
      return `<dokuha_status>
affection: ${state.affection}/255
affectionTier: ${affectionProfile.affectionTier}
attachmentLevel: ${affectionProfile.attachmentLevel}
relationshipStage: ${affectionProfile.relationshipStage}
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
    function buildAffectionGuide(state) {
      const profile = deriveAffectionProfile(state);
      return `<dokuha_affection_guide>
目标: 只用 MVU JSONPatch 更新 stat_data.dokuha.affection，不写旧 ERA 字段。
当前好感度: ${profile.affection}/255
当前好感层级: ${profile.affectionTier}
当前关系阶段(派生): ${profile.relationshipStage}
当前依恋阶段(派生): ${profile.attachmentLevel}

好感度变化评估:
1. 判断本轮互动质量: 重大正面 / 一般正面 / 中性 / 轻度负面 / 重大负面。
2. 检查 {{user}} 是否让 Dokuha 感到被理解、被帮助、被尊重、被冒犯、被误解或被忽视。
3. 旧 familiarity_change +1 等价于 affection +4。按下列范围换算:
- 重大正面: affection +24 ~ +40
- 一般正面: affection +12 ~ +20
- 中性: affection +4 ~ +8
- 轻度负面: affection -4 ~ -12
- 重大负面: affection -16 ~ -24
4. affection 必须保持在 0..255。关系阶段和依恋阶段由 affection 自动派生，不要直接写入 relationship_stage、attachment_level 或 familiarity_change。

MVU JSONPatch 示例:
[
  { "op": "delta", "path": "/dokuha/affection", "value": 12 }
]
</dokuha_affection_guide>`;
    }
    function isDryRun(args) {
      if (args.length >= 3) return args[2] === true;
      const detail = args[0];
      return Boolean(detail && typeof detail === "object" && detail.dryRun === true);
    }
    RUNTIME.createPromptInjection = function createPromptInjection(stateService) {
      async function injectCurrentState(...args) {
        if (isDryRun(args)) return false;
        if (typeof ROOT.injectPrompts !== "function") return false;
        let state;
        try {
          state = await stateService.loadState({ persist: false });
        } catch (error) {
          console.warn("[DOKUHA Prompt] loadState failed:", error);
          return false;
        }
        const content = `${buildDokuhaPrompt(state)}

${buildAffectionGuide(state)}`;
        try {
          if (typeof ROOT.uninjectPrompts === "function") ROOT.uninjectPrompts([INJECT_ID]);
        } catch (_) {
        }
        ROOT.injectPrompts([{
          id: INJECT_ID,
          position: "in_chat",
          depth: 2,
          role: "system",
          should_scan: false,
          content
        }]);
        return true;
      }
      return {
        INJECT_ID,
        buildDokuhaPrompt,
        buildAffectionGuide,
        injectCurrentState
      };
    };
  })();
})();
