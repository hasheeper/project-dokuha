import type { DokuhaSTBridgeApi } from '../bridge/st-bridge-types';

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
    DOKUHASchemaRuntime?: any;
    DOKUHAPlugin?: any;
    ST_BRIDGE_PACK?: string;
    ST_BRIDGE_URL?: string;
    ST_BRIDGE_MANIFEST_URL?: string;
  }
}

export {};
