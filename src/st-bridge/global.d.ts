import type { DokuhaAffectionProfile, DokuhaFamiliarityProfile, DokuhaSTBridgeApi } from '../bridge/st-bridge-types';

declare global {
  const unsafeWindow: any;
  const handleVariablesInMessage: any;
  const eventOn: any;
  const injectPrompts: any;
  const uninjectPrompts: any;
  const getVariables: any;
  const insertOrAssignVariables: any;
  const updateVariablesWith: any;
  const registerMacroLike: any;
  const unregisterMacroLike: any;
  const triggerSlash: any;
  const tavern_events: any;

  interface Window {
    [key: string]: any;
    STBridge?: DokuhaSTBridgeApi;
    DOKUHA_ST_HOST?: any;
    DOKUHA_ST_HOST_ROOT?: any;
    DOKUHA_ST_UI_ROOT?: any;
    DOKUHA_ST_API_ROOT?: any;
    DOKUHA_ST_API?: any;
    __DOKUHA_ST_BRIDGE_READY__?: Promise<unknown>;
    DOKUHAMainRuntime?: any;
    DOKUHASchemaRuntime?: {
      product: string;
      DEFAULT_DOKUHA_STATE: unknown;
      makeDefaultDokuhaState(): unknown;
      normalizeDokuhaState(value?: unknown): unknown;
      deriveFamiliarityProfile(stateOrPoints: unknown): DokuhaFamiliarityProfile;
      deriveAffectionProfile(stateOrAffection: unknown): DokuhaAffectionProfile;
      DokuhaSchema?: unknown;
      DOKUHAStatDataSchema?: unknown;
    };
    DOKUHAPlugin?: any;
    ST_BRIDGE_PACK?: string;
    ST_BRIDGE_URL?: string;
    ST_BRIDGE_MANIFEST_URL?: string;
    ST_BRIDGE_ENV?: 'local' | 'prod';
    ST_BRIDGE_CACHE_BUST?: string;
    ST_BRIDGE_FORCE_RELOAD?: boolean | string | number;
    DOKUHA_APP_BASE_URL?: string;
    DOKUHA_APP_URL?: string;
    DOKUHA_STATUS_URL?: string;
  }
}

export {};
