import type { DokuhaAffectionProfile, DokuhaSTBridgeApi } from '../bridge/st-bridge-types';

declare global {
  const unsafeWindow: any;
  const handleVariablesInMessage: any;

  interface Window {
    [key: string]: any;
    STBridge?: DokuhaSTBridgeApi;
    DOKUHA_ST_HOST?: any;
    DOKUHA_ST_HOST_ROOT?: any;
    DOKUHA_ST_UI_ROOT?: any;
    DOKUHA_ST_API_ROOT?: any;
    DOKUHAMainRuntime?: any;
    DOKUHASchemaRuntime?: {
      product: string;
      DEFAULT_DOKUHA_STATE: unknown;
      makeDefaultDokuhaState(): unknown;
      normalizeDokuhaState(value?: unknown): unknown;
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
    DOKUHA_APP_BASE_URL?: string;
    DOKUHA_APP_URL?: string;
    DOKUHA_STATUS_URL?: string;
  }
}

export {};
