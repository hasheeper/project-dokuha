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
  function clone(value, fallback = null) {
    return cloneJson(value, fallback);
  }
  function makeDefaultDokuhaState() {
    return clone(DEFAULT_DOKUHA_STATE$1, DEFAULT_DOKUHA_STATE$1);
  }
  function normalizeDokuhaState$1(value = {}) {
    return normalizeDokuhaState(value);
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
    const statDataSchema = zod.object({
      dokuha: dokuhaSchema
    }).passthrough().transform((statData) => ({
      ...statData,
      dokuha: normalizeDokuhaState$1(statData.dokuha)
    }));
    return { dokuhaSchema, statDataSchema };
  }
  const schemas = createStatDataSchema();
  ROOT.DOKUHASchemaRuntime = {
    product: "project-dokuha",
    DEFAULT_DOKUHA_STATE: DEFAULT_DOKUHA_STATE$1,
    makeDefaultDokuhaState,
    normalizeDokuhaState: normalizeDokuhaState$1,
    DokuhaSchema: schemas?.dokuhaSchema || null,
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
