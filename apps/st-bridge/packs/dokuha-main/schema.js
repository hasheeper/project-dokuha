const DOKUHA_MODES = ["normal", "tired_mode", "hell_mode"];
const DOKUHA_DISORDERS = ["asd_active", "adhd_active", "bpd_active", "pmdd_active"];
const DOKUHA_LONG_TERM_EMOTIONS = ["depressed", "exhausted", "normal", "comfortable", "irritated", "paralyzed"];
const DOKUHA_DYNAMIC_EMOTIONS = ["normal", "warm", "passionate", "slightly_cold", "freezing_cold"];
const DOKUHA_OUTFITS = ["streetwear_full", "streetwear_inner", "nightwear", "underwear", "nude"];
const DOKUHA_MASK_STATES = ["no_mask", "mask_up", "mask_down"];
const DOKUHA_EVENT_TYPES = ["none", "daily_event", "relationship_event", "dokuha_crisis_event", "pmdd_event", "bad_luck"];
const DOKUHA_EVENT_PHASES = ["none", "ongoing", "end"];
const DOKUHA_FAMILIARITY_SCALE = 5;
const DOKUHA_FAMILIARITY_MAX = 500;
const DOKUHA_FAMILIARITY_TIER_THRESHOLDS = {
  mid: 20 * DOKUHA_FAMILIARITY_SCALE,
  high: 50 * DOKUHA_FAMILIARITY_SCALE
};
const DOKUHA_RELATIONSHIP_THRESHOLDS = {
  friend: 20 * DOKUHA_FAMILIARITY_SCALE,
  lover: 30 * DOKUHA_FAMILIARITY_SCALE
};
const DOKUHA_ATTACHMENT_THRESHOLDS = {
  light_attached: 15 * DOKUHA_FAMILIARITY_SCALE,
  heavy_attached: 35 * DOKUHA_FAMILIARITY_SCALE
};
const DOKUHA_PMDD_CYCLE_RULE = Object.freeze({
  cycleLengthDays: 32,
  follicularEndDay: 14,
  pmddWindowStartDay: 25,
  pmddWindowEndDay: 32,
  minCooldownHours: 36,
  followupGraceHours: 48
});
const DOKUHA_PHYSIOLOGY_PHASE_LABELS = {
  follicular: "卵泡期（日常）",
  luteal: "黄体期（情绪起伏）",
  pmdd_window: "PMDD高发窗口",
  post_window: "窗口结束（需补叙）"
};
const DOKUHA_PHYSIOLOGY_MOOD_LINES = {
  "卵泡期（日常）": "Physiology: Stable & Chill. Energy is normal, body feels light.",
  "黄体期（情绪起伏）": "Physiology: Unstable. Sensitive, clingy, and emotionally fragile.",
  "PMDD高发窗口": "Physiology: CRITICAL. In pain, defensive, and completely drained.",
  "窗口结束（需补叙）": "Physiology: Recovery. Weak, empty, and needing gentle care."
};
const DOKUHA_PMDD_JUDGMENTS = {
  follicular: "❌ 当前处于生理周期前半段，禁止触发 PMDD/Hell。",
  luteal: "⚠️ 黄体期：可安排轻度波动或预兆，但不要直接进入 PMDD。",
  pmdd_window: "✓ 正处于 PMDD 高发窗口，默认进入 Hell Mode（请维持生理症状连贯性）。",
  post_window: "⚠️ 已超过 PMDD 窗口，若强行触发需先补叙缺失的症状演化。"
};
const DEFAULT_DOKUHA_STATE = {
  familiarity: {
    points: 0,
    tier: "low"
  },
  coreStates: {
    mode: "normal",
    relationshipStage: "neighbor",
    attachmentLevel: "non_attached"
  },
  mentalStates: {
    disorderActive: [],
    longTermEmotion: "normal",
    dynamicEmotion: "slightly_cold"
  },
  outfit: "streetwear_full",
  accessories: ["no_mask"],
  current_location: "ApartmentHallway",
  current_event: {
    type: "none",
    name: "",
    phase: "none",
    start_time: ""
  },
  metadata: {
    last_pmdd_time: null,
    pmdd_cycle_anchor: "2026-06-29T20:00:00",
    pmdd_followup_consumed: false
  },
  context_notes: {
    event_summaries: [],
    pending_event_summary: "",
    pending_new_event_hint: false
  }
};
const DEFAULT_DOKUHA_SYSTEM_STATE = {
  current_time: {
    year: 2026,
    month: 6,
    day: 29,
    hour: 20,
    minute: 0,
    day_of_week: "周一"
  },
  time_advance: null,
  time_set_to: null,
  event_start: {
    name: null,
    type: null
  }
};
function deriveFamiliarityTier(points) {
  const safePoints = clampNumber(points, 0, DOKUHA_FAMILIARITY_MAX, DEFAULT_DOKUHA_STATE.familiarity.points);
  if (safePoints >= DOKUHA_FAMILIARITY_TIER_THRESHOLDS.high) return "high";
  if (safePoints >= DOKUHA_FAMILIARITY_TIER_THRESHOLDS.mid) return "mid";
  return "low";
}
function deriveFamiliarityProfile(stateOrPoints) {
  const source = isRecord(stateOrPoints) ? stateOrPoints : {};
  const rawPoints = isRecord(source.familiarity) ? source.familiarity.points : source.familiarity_points ?? source.affection ?? stateOrPoints;
  const points = clampNumber(rawPoints, 0, DOKUHA_FAMILIARITY_MAX, DEFAULT_DOKUHA_STATE.familiarity.points);
  const legacyCoreStates = isRecord(source.core_states) ? source.core_states : {};
  const coreStates = isRecord(source.coreStates) ? source.coreStates : legacyCoreStates;
  return {
    familiarityPoints: points,
    familiarityTier: deriveFamiliarityTier(points),
    attachmentLevel: normalizeChoice(coreStates.attachmentLevel, ["non_attached", "light_attached", "heavy_attached"], DEFAULT_DOKUHA_STATE.coreStates.attachmentLevel),
    relationshipStage: normalizeChoice(coreStates.relationshipStage, ["neighbor", "friend", "lover"], DEFAULT_DOKUHA_STATE.coreStates.relationshipStage),
    thresholds: {
      relationship: DOKUHA_RELATIONSHIP_THRESHOLDS,
      attachment: DOKUHA_ATTACHMENT_THRESHOLDS,
      tier: DOKUHA_FAMILIARITY_TIER_THRESHOLDS
    }
  };
}
function ensureMetadataHasPMDDAnchor(metadata, system = {}, nowGameDate = /* @__PURE__ */ new Date()) {
  if (metadata.pmdd_cycle_anchor) return metadata;
  const currentTime = isRecord(system) && isRecord(system.current_time) ? system.current_time : system;
  const currentDate = currentTime ? timeObjectToDate(currentTime) : null;
  const fallback = currentDate && !Number.isNaN(currentDate.getTime()) ? currentDate : nowGameDate instanceof Date && !Number.isNaN(nowGameDate.getTime()) ? nowGameDate : /* @__PURE__ */ new Date();
  return {
    ...metadata,
    pmdd_cycle_anchor: formatMetadataTimestamp(fallback)
  };
}
function calculatePMDDInterval(lastPMDDTime, nowGameDate = /* @__PURE__ */ new Date()) {
  if (!lastPMDDTime) return 999;
  const anchor = nowGameDate instanceof Date && !Number.isNaN(nowGameDate.getTime()) ? nowGameDate : /* @__PURE__ */ new Date();
  const lastPMDD = new Date(String(lastPMDDTime));
  if (Number.isNaN(lastPMDD.getTime())) return 999;
  const diffMs = anchor.getTime() - lastPMDD.getTime();
  return Math.floor(diffMs / ONE_DAY_MS);
}
function computePMDDCycleDay(metadata, nowGameDate = /* @__PURE__ */ new Date()) {
  let anchor = metadata.pmdd_cycle_anchor ? new Date(metadata.pmdd_cycle_anchor) : null;
  if (!anchor || Number.isNaN(anchor.getTime())) {
    const fallback = metadata.last_pmdd_time ? new Date(metadata.last_pmdd_time) : nowGameDate;
    anchor = new Date(fallback.getTime() - (DOKUHA_PMDD_CYCLE_RULE.pmddWindowStartDay - 1) * ONE_DAY_MS);
  }
  const diffDays = Math.max(0, Math.floor((nowGameDate.getTime() - anchor.getTime()) / ONE_DAY_MS));
  const cycleDay = diffDays % DOKUHA_PMDD_CYCLE_RULE.cycleLengthDays + 1;
  return { anchor, cycleDay };
}
function generatePMDDJudgment(metadata, nowGameDate = /* @__PURE__ */ new Date(), pmddIntervalDays = calculatePMDDInterval(metadata.last_pmdd_time, nowGameDate)) {
  const { anchor, cycleDay } = computePMDDCycleDay(metadata, nowGameDate);
  const lastEpisode = metadata.last_pmdd_time ? new Date(metadata.last_pmdd_time) : null;
  const hoursSinceEpisode = lastEpisode && !Number.isNaN(lastEpisode.getTime()) ? (nowGameDate.getTime() - lastEpisode.getTime()) / ONE_HOUR_MS : Infinity;
  const cooldownRemaining = lastEpisode ? Math.max(0, DOKUHA_PMDD_CYCLE_RULE.minCooldownHours - hoursSinceEpisode) : 0;
  let phase = "post_window";
  if (cycleDay <= DOKUHA_PMDD_CYCLE_RULE.follicularEndDay) {
    phase = "follicular";
  } else if (cycleDay < DOKUHA_PMDD_CYCLE_RULE.pmddWindowStartDay) {
    phase = "luteal";
  } else if (cycleDay < DOKUHA_PMDD_CYCLE_RULE.pmddWindowEndDay) {
    phase = "pmdd_window";
  }
  const phaseLabel = DOKUHA_PHYSIOLOGY_PHASE_LABELS[phase];
  return {
    judgment: DOKUHA_PMDD_JUDGMENTS[phase],
    canTrigger: phase === "pmdd_window",
    intervalDays: pmddIntervalDays,
    cycleDay,
    phase,
    phaseLabel,
    moodLine: DOKUHA_PHYSIOLOGY_MOOD_LINES[phaseLabel] || "",
    cooldownHoursRemaining: cooldownRemaining > 0 ? Math.ceil(cooldownRemaining) : 0,
    cycleAnchor: formatMetadataTimestamp(anchor),
    lastPMDDTime: metadata.last_pmdd_time
  };
}
function derivePhysiologyProfile(stateOrDokuha, systemOrTime = {}) {
  const state = normalizeDokuhaState(stateOrDokuha);
  const system = normalizeDokuhaSystemState(
    isRecord(systemOrTime) && isRecord(systemOrTime.current_time) ? systemOrTime : { current_time: systemOrTime }
  );
  const nowGameDate = timeObjectToDate(system.current_time);
  const metadata = ensureMetadataHasPMDDAnchor(state.metadata, system, nowGameDate);
  const intervalDays = calculatePMDDInterval(metadata.last_pmdd_time, nowGameDate);
  return generatePMDDJudgment(metadata, nowGameDate, intervalDays);
}
function normalizeDokuhaState(value) {
  const source = isRecord(value) ? value : {};
  const legacyCoreStates = isRecord(source.core_states) ? source.core_states : {};
  const coreStates = isRecord(source.coreStates) ? source.coreStates : legacyCoreStates;
  const legacyMentalStates = isRecord(source.mental_states) ? source.mental_states : {};
  const mentalStates = isRecord(source.mentalStates) ? source.mentalStates : legacyMentalStates;
  const familiarity = normalizeFamiliarity(source);
  return {
    familiarity,
    coreStates: {
      mode: normalizeChoice(
        coreStates.mode,
        DOKUHA_MODES,
        DEFAULT_DOKUHA_STATE.coreStates.mode
      ),
      relationshipStage: normalizeChoice(
        coreStates.relationshipStage ?? coreStates.relationship_stage,
        ["neighbor", "friend", "lover"],
        DEFAULT_DOKUHA_STATE.coreStates.relationshipStage
      ),
      attachmentLevel: normalizeChoice(
        coreStates.attachmentLevel ?? coreStates.attachment_level,
        ["non_attached", "light_attached", "heavy_attached"],
        DEFAULT_DOKUHA_STATE.coreStates.attachmentLevel
      )
    },
    mentalStates: {
      disorderActive: normalizeDisorderActive(mentalStates.disorderActive ?? mentalStates.disorder_active),
      longTermEmotion: normalizeChoice(
        mentalStates.longTermEmotion ?? mentalStates.long_term_emotion,
        DOKUHA_LONG_TERM_EMOTIONS,
        DEFAULT_DOKUHA_STATE.mentalStates.longTermEmotion
      ),
      dynamicEmotion: normalizeChoice(
        mentalStates.dynamicEmotion ?? mentalStates.dynamic_emotion,
        DOKUHA_DYNAMIC_EMOTIONS,
        DEFAULT_DOKUHA_STATE.mentalStates.dynamicEmotion
      )
    },
    outfit: normalizeChoice(source.outfit, DOKUHA_OUTFITS, DEFAULT_DOKUHA_STATE.outfit),
    accessories: normalizeAccessories(source.accessories),
    current_location: normalizeNonEmptyString(
      source.current_location ?? source.currentLocation,
      DEFAULT_DOKUHA_STATE.current_location
    ),
    current_event: normalizeCurrentEvent(source.current_event ?? source.currentEvent),
    metadata: normalizeMetadata(source.metadata),
    context_notes: normalizeContextNotes(source.context_notes ?? source.contextNotes)
  };
}
function normalizeDokuhaSystemState(value) {
  const source = isRecord(value) ? value : {};
  const currentTime = isRecord(source.current_time) ? source.current_time : {};
  const eventStart = isRecord(source.event_start) ? source.event_start : {};
  const eventType = normalizeChoice(
    eventStart.type,
    ["daily_event", "relationship_event", "dokuha_crisis_event", "pmdd_event", "bad_luck"],
    null
  );
  return {
    current_time: normalizeTimeObject(currentTime),
    time_advance: normalizeNullableString(source.time_advance),
    time_set_to: normalizeNullableString(source.time_set_to),
    event_start: {
      name: normalizeNullableString(eventStart.name),
      type: eventType || null
    }
  };
}
function normalizeFamiliarity(source) {
  const rawFamiliarity = isRecord(source.familiarity) ? source.familiarity : {};
  const rawPoints = rawFamiliarity.points ?? source.familiarity_points ?? source.affection;
  const points = clampNumber(rawPoints, 0, DOKUHA_FAMILIARITY_MAX, DEFAULT_DOKUHA_STATE.familiarity.points);
  return {
    points,
    tier: deriveFamiliarityTier(points)
  };
}
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function normalizeNonEmptyString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
function normalizeNullableString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function normalizeMetadata(value) {
  const source = isRecord(value) ? value : {};
  return {
    last_pmdd_time: normalizeNullableString(source.last_pmdd_time ?? source.lastPMDDTime),
    pmdd_cycle_anchor: normalizeNullableString(source.pmdd_cycle_anchor ?? source.pmddCycleAnchor) || DEFAULT_DOKUHA_STATE.metadata.pmdd_cycle_anchor,
    pmdd_followup_consumed: source.pmdd_followup_consumed === true || source.pmddFollowupConsumed === true
  };
}
function normalizeContextNotes(value) {
  const source = isRecord(value) ? value : {};
  const rawSummaries = Array.isArray(source.event_summaries) ? source.event_summaries : Array.isArray(source.eventSummaries) ? source.eventSummaries : [];
  const eventSummaries = rawSummaries.map((item) => normalizeEventSummary(item)).filter((item) => Boolean(item)).slice(-6);
  return {
    event_summaries: eventSummaries,
    pending_event_summary: sanitizeContextNote(source.pending_event_summary ?? source.pendingEventSummary),
    pending_new_event_hint: source.pending_new_event_hint === true || source.pendingNewEventHint === true
  };
}
function normalizeEventSummary(value) {
  const source = isRecord(value) ? value : {};
  const type = normalizeChoice(source.type, DOKUHA_EVENT_TYPES, "daily_event");
  const summary = sanitizeContextNote(source.summary);
  if (!summary) return null;
  return {
    id: normalizeNonEmptyString(source.id, makeEventSummaryId(source.name, type, source.ended_at)),
    type,
    name: normalizeNonEmptyString(source.name, "UnnamedEvent"),
    ended_at: normalizeNonEmptyString(source.ended_at ?? source.endedAt, ""),
    summary,
    familiarity_points: clampNumber(source.familiarity_points ?? source.familiarityPoints, 0, DOKUHA_FAMILIARITY_MAX, 0),
    relationship_stage: normalizeChoice(
      source.relationship_stage ?? source.relationshipStage,
      ["neighbor", "friend", "lover"],
      DEFAULT_DOKUHA_STATE.coreStates.relationshipStage
    ),
    attachment_level: normalizeChoice(
      source.attachment_level ?? source.attachmentLevel,
      ["non_attached", "light_attached", "heavy_attached"],
      DEFAULT_DOKUHA_STATE.coreStates.attachmentLevel
    )
  };
}
function sanitizeContextNote(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[<>]/g, (char) => char === "<" ? "‹" : "›").replace(/\s+/g, " ").trim().slice(0, 420);
}
function clampNumber(value, min, max, fallback) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.max(min, Math.min(max, Math.round(next)));
}
function normalizeChoice(value, choices, fallback) {
  return typeof value === "string" && choices.includes(value) ? value : fallback;
}
function normalizeDisorderActive(value) {
  const raw = Array.isArray(value) ? value : typeof value === "string" && value !== "none" ? value.split(/[,| ]+/) : [];
  const result = [];
  raw.forEach((item) => {
    if (typeof item !== "string") return;
    if (!DOKUHA_DISORDERS.includes(item)) return;
    if (!result.includes(item)) result.push(item);
  });
  return result;
}
function normalizeAccessories(value) {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,| ]+/) : [];
  let maskState = "no_mask";
  let hasHeadphones = false;
  raw.forEach((item) => {
    if (typeof item !== "string") return;
    if (DOKUHA_MASK_STATES.includes(item)) {
      maskState = item;
      return;
    }
    if (item === "headphones") hasHeadphones = true;
  });
  return hasHeadphones ? [maskState, "headphones"] : [maskState];
}
function normalizeTimeObject(value) {
  const source = isRecord(value) ? value : {};
  const fallback = DEFAULT_DOKUHA_SYSTEM_STATE.current_time;
  return {
    year: clampNumber(source.year, 1, 9999, fallback.year),
    month: clampNumber(source.month, 1, 12, fallback.month),
    day: clampNumber(source.day, 1, 31, fallback.day),
    hour: clampNumber(source.hour, 0, 23, fallback.hour),
    minute: clampNumber(source.minute, 0, 59, fallback.minute),
    day_of_week: normalizeNonEmptyString(source.day_of_week ?? source.dayOfWeek, fallback.day_of_week)
  };
}
function normalizeCurrentEvent(value) {
  const source = isRecord(value) ? value : {};
  const type = normalizeChoice(source.type, DOKUHA_EVENT_TYPES, DEFAULT_DOKUHA_STATE.current_event.type);
  const isNone = type === "none";
  return {
    type,
    name: isNone ? "" : normalizeNonEmptyString(source.name, DEFAULT_DOKUHA_STATE.current_event.name),
    phase: isNone ? "none" : normalizeChoice(source.phase, DOKUHA_EVENT_PHASES, DEFAULT_DOKUHA_STATE.current_event.phase),
    start_time: isNone ? "" : normalizeNonEmptyString(source.start_time ?? source.startTime, "")
  };
}
const ONE_HOUR_MS = 60 * 60 * 1e3;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
function timeObjectToDate(value) {
  const currentTime = normalizeTimeObject(value);
  return new Date(
    currentTime.year,
    currentTime.month - 1,
    currentTime.day,
    currentTime.hour || 0,
    currentTime.minute || 0,
    0,
    0
  );
}
function formatMetadataTimestamp(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`;
}
function pad2(value) {
  return String(value).padStart(2, "0");
}
function makeEventSummaryId(name, type, endedAt) {
  return [name, type, endedAt].map((item) => String(item || "").trim()).filter(Boolean).join(":").replace(/[^\w:.-]+/g, "-").slice(0, 120) || "event-summary";
}
function cloneJson(value, fallback) {
  if (value === void 0 || value === null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return fallback;
  }
}
(function() {
  const CURRENT_ROOT = typeof window !== "undefined" ? window : globalThis;
  const PLUGIN_NAME = "[DOKUHA Schema]";
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
  const DEFAULT_DOKUHA_STATE$1 = DEFAULT_DOKUHA_STATE;
  const DEFAULT_DOKUHA_SYSTEM_STATE$1 = DEFAULT_DOKUHA_SYSTEM_STATE;
  function clone(value, fallback = null) {
    return cloneJson(value, fallback);
  }
  function makeDefaultDokuhaState() {
    return clone(DEFAULT_DOKUHA_STATE$1, DEFAULT_DOKUHA_STATE$1);
  }
  function makeDefaultDokuhaSystemState() {
    return clone(DEFAULT_DOKUHA_SYSTEM_STATE$1, DEFAULT_DOKUHA_SYSTEM_STATE$1);
  }
  function normalizeDokuhaState$1(value = {}) {
    return normalizeDokuhaState(value);
  }
  function normalizeDokuhaSystemState$1(value = {}) {
    return normalizeDokuhaSystemState(value);
  }
  function deriveFamiliarityProfile$1(stateOrPoints) {
    return deriveFamiliarityProfile(stateOrPoints);
  }
  function derivePhysiologyProfile$1(stateOrDokuha, systemOrTime = {}) {
    return derivePhysiologyProfile(stateOrDokuha, systemOrTime);
  }
  function resolveZod() {
    return ROOT.z || ROOT.zod || ROOT.Zod || null;
  }
  async function loadRegisterMvuSchema() {
    try {
      const module = await import(
        /* @vite-ignore */
        "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js"
      );
      return typeof module.registerMvuSchema === "function" ? module.registerMvuSchema : null;
    } catch (error) {
      console.warn(`${PLUGIN_NAME} MVU-zod module unavailable:`, error);
      return null;
    }
  }
  function createStatDataSchema() {
    const zod = resolveZod();
    if (!zod || typeof zod.object !== "function" || typeof zod.any !== "function") return null;
    const dokuhaSchema = zod.any().default({}).transform((value) => normalizeDokuhaState$1(value));
    const systemSchema = zod.any().default({}).transform((value) => normalizeDokuhaSystemState$1(value));
    const statDataSchema = zod.object({
      dokuha: dokuhaSchema,
      system: systemSchema
    }).passthrough().transform((statData) => ({
      ...statData,
      dokuha: normalizeDokuhaState$1(statData.dokuha),
      system: normalizeDokuhaSystemState$1(statData.system)
    }));
    return { dokuhaSchema, systemSchema, statDataSchema };
  }
  const schemas = createStatDataSchema();
  ROOT.DOKUHASchemaRuntime = {
    product: "project-dokuha",
    DEFAULT_DOKUHA_STATE: DEFAULT_DOKUHA_STATE$1,
    DEFAULT_DOKUHA_SYSTEM_STATE: DEFAULT_DOKUHA_SYSTEM_STATE$1,
    makeDefaultDokuhaState,
    makeDefaultDokuhaSystemState,
    normalizeDokuhaState: normalizeDokuhaState$1,
    normalizeDokuhaSystemState: normalizeDokuhaSystemState$1,
    deriveFamiliarityProfile: deriveFamiliarityProfile$1,
    deriveAffectionProfile: deriveFamiliarityProfile$1,
    derivePhysiologyProfile: derivePhysiologyProfile$1,
    DokuhaSchema: schemas?.dokuhaSchema || null,
    DokuhaSystemSchema: schemas?.systemSchema || null,
    DOKUHAStatDataSchema: schemas?.statDataSchema || null
  };
  async function registerSchemaWhenReady() {
    try {
      ROOT.STBridge?.mvuz?.registerSchema?.("dokuha", {
        version: "0.1.0",
        rootKey: "stat_data",
        makeDefaultState: makeDefaultDokuhaState,
        normalize: normalizeDokuhaState$1
      });
    } catch (error) {
      console.warn(`${PLUGIN_NAME} STBridge schema registration skipped:`, error);
    }
    if (!schemas?.statDataSchema) {
      console.warn(`${PLUGIN_NAME} MVU-zod schema skipped: zod runtime unavailable`);
      return;
    }
    const registerMvuSchema = await loadRegisterMvuSchema();
    if (typeof registerMvuSchema !== "function") {
      console.warn(`${PLUGIN_NAME} registerMvuSchema unavailable`);
      return;
    }
    registerMvuSchema(schemas.statDataSchema);
    console.info(`${PLUGIN_NAME} MVU-zod schema registered: stat_data.dokuha`);
  }
  if (typeof ROOT.$ === "function") {
    ROOT.$(() => {
      void registerSchemaWhenReady();
    });
  } else {
    void registerSchemaWhenReady();
  }
})();
