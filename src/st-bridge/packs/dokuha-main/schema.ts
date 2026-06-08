import {
  DEFAULT_DOKUHA_STATE as SHARED_DEFAULT_DOKUHA_STATE,
  cloneJson,
  deriveAffectionProfile as deriveSharedAffectionProfile,
  normalizeDokuhaState as normalizeSharedDokuhaState
} from '../../shared/dokuha';

type RegisterMvuSchema = (schema: unknown) => void;

(function () {
  'use strict';

  const CURRENT_ROOT = typeof window !== 'undefined' ? window : globalThis;
  const PLUGIN_NAME = '[DOKUHA Schema]';

  function resolveBridgeHost() {
    try { if (CURRENT_ROOT.DOKUHA_ST_HOST) return CURRENT_ROOT.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.DOKUHA_ST_HOST_ROOT?.DOKUHA_ST_HOST) return CURRENT_ROOT.DOKUHA_ST_HOST_ROOT.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.parent?.DOKUHA_ST_HOST) return CURRENT_ROOT.parent.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.top?.DOKUHA_ST_HOST) return CURRENT_ROOT.top.DOKUHA_ST_HOST; } catch (_) {}
    return {};
  }

  const BRIDGE_HOST = resolveBridgeHost();
  const ROOT = BRIDGE_HOST.apiRoot || CURRENT_ROOT.DOKUHA_ST_API_ROOT || CURRENT_ROOT.DOKUHA_ST_HOST_ROOT || CURRENT_ROOT;

  const DEFAULT_DOKUHA_STATE = SHARED_DEFAULT_DOKUHA_STATE;

  function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value, fallback: any = null): any {
    return cloneJson(value, fallback);
  }

  function clampNumber(value, min, max, fallback = 0) {
    const next = Number(value);
    if (!Number.isFinite(next)) return fallback;
    return Math.max(min, Math.min(max, Math.round(next)));
  }

  function normalizeString(value, fallback = '') {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  function makeDefaultDokuhaState() {
    return clone(DEFAULT_DOKUHA_STATE, DEFAULT_DOKUHA_STATE);
  }

  function normalizeDokuhaState(value = {}) {
    return normalizeSharedDokuhaState(value);
  }

  function deriveAffectionProfile(stateOrAffection) {
    return deriveSharedAffectionProfile(stateOrAffection);
  }

  function resolveZod() {
    return ROOT.z || ROOT.zod || ROOT.Zod || null;
  }

  async function loadRegisterMvuSchema(): Promise<RegisterMvuSchema | null> {
    try {
      const module = await import(/* @vite-ignore */ 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js');
      return typeof module.registerMvuSchema === 'function' ? module.registerMvuSchema : null;
    } catch (error) {
      console.warn(`${PLUGIN_NAME} MVU-zod module unavailable:`, error);
      return null;
    }
  }

  function createStatDataSchema() {
    const zod = resolveZod();
    if (!zod || typeof zod.object !== 'function' || typeof zod.any !== 'function') return null;
    const dokuhaSchema = zod.any().default({}).transform((value) => normalizeDokuhaState(value));
    const statDataSchema = zod.object({
      dokuha: dokuhaSchema
    }).passthrough().transform((statData) => ({
      ...statData,
      dokuha: normalizeDokuhaState(statData.dokuha)
    }));
    return { dokuhaSchema, statDataSchema };
  }

  const schemas = createStatDataSchema();

  ROOT.DOKUHASchemaRuntime = {
    product: 'project-dokuha',
    DEFAULT_DOKUHA_STATE,
    makeDefaultDokuhaState,
    normalizeDokuhaState,
    deriveAffectionProfile,
    DokuhaSchema: schemas?.dokuhaSchema || null,
    DOKUHAStatDataSchema: schemas?.statDataSchema || null
  };

  async function registerSchemaWhenReady() {
    try {
      ROOT.STBridge?.mvuz?.registerSchema?.('dokuha', {
        version: '0.1.0',
        rootKey: 'stat_data',
        makeDefaultState: makeDefaultDokuhaState,
        normalize: normalizeDokuhaState
      });
    } catch (error) {
      console.warn(`${PLUGIN_NAME} STBridge schema registration skipped:`, error);
    }

    if (!schemas?.statDataSchema) {
      console.warn(`${PLUGIN_NAME} MVU-zod schema skipped: zod runtime unavailable`);
      return;
    }
    const registerMvuSchema = await loadRegisterMvuSchema();
    if (typeof registerMvuSchema !== 'function') {
      console.warn(`${PLUGIN_NAME} registerMvuSchema unavailable`);
      return;
    }
    registerMvuSchema(schemas.statDataSchema);
    console.info(`${PLUGIN_NAME} MVU-zod schema registered: stat_data.dokuha`);
  }

  if (typeof ROOT.$ === 'function') {
    ROOT.$(() => {
      void registerSchemaWhenReady();
    });
  } else {
    void registerSchemaWhenReady();
  }
})();
