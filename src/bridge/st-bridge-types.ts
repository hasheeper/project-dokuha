export interface DokuhaSTBridgeState {
  bridgeVersion: string;
  manifestUrl: string;
  manifestVersion: string;
  packId: string;
  product: string;
  label: string;
  env: 'local' | 'prod';
  appBaseUrl: string;
  appUrl: string;
  statusUrl: string;
  loaded: Array<{ id?: string; type?: string; url: string }>;
  loadedAt: string;
}

export interface DokuhaSTBridgeApi {
  version: string;
  state: DokuhaSTBridgeState;
  actionHandlers: Record<string, Record<string, (payload?: unknown) => unknown | Promise<unknown>>>;
  mvu: {
    readVariables(options?: { type?: string }): Promise<Record<string, unknown>>;
    writeVariables(data: Record<string, unknown>, options?: { type?: string }): Promise<Record<string, unknown>>;
    readState(rootKey?: string, stateKey?: string | null, options?: { type?: string }): Promise<unknown>;
    writeState(rootKey: string, stateKey: string | null, state: unknown, options?: { type?: string }): Promise<unknown>;
    patchState(rootKey: string, stateKey: string | null, patcher: (draft: unknown, current: unknown) => unknown | Promise<unknown>, options?: { type?: string }): Promise<unknown>;
  };
  mvuz: {
    schemas: Record<string, DokuhaMvuzSchema>;
    registerSchema(namespace: string, schema: Partial<DokuhaMvuzSchema>): DokuhaMvuzSchema | null;
    getSchema(namespace?: string): DokuhaMvuzSchema | null;
    normalize(namespace?: string, value?: unknown): unknown;
    read(namespace?: string, options?: { type?: string; rootKey?: string }): Promise<unknown>;
    write(namespace: string, state: unknown, options?: { type?: string; rootKey?: string }): Promise<unknown>;
    patch(namespace: string, patcher: (draft: any, current: unknown) => unknown | Promise<unknown>, options?: { type?: string; rootKey?: string }): Promise<unknown>;
    migrate(namespace?: string, legacyVars?: unknown, options?: { type?: string; rootKey?: string }): Promise<unknown>;
  };
  host?: Record<string, unknown>;
  utils?: {
    resolveUrl(path: string, base?: string): string;
    withCache(url: string): string;
    bridgeRoot: string;
    env: 'local' | 'prod';
    appBaseUrl: string;
    appUrl: string;
    statusUrl: string;
  };
  registerActions(namespace: string, handlers: Record<string, (payload?: unknown) => unknown | Promise<unknown>>): void;
  dispatch(namespace: string, action: string, payload?: unknown): Promise<unknown>;
  reload(): Promise<unknown>;
}

export interface DokuhaMvuzSchema {
  namespace: string;
  version: string;
  rootKey: string;
  makeDefaultState(): unknown;
  normalize(value: unknown): unknown;
  migrate: ((legacyVars: unknown) => unknown | Promise<unknown>) | null;
}

declare global {
  interface Window {
    STBridge?: DokuhaSTBridgeApi;
    ST_BRIDGE_PACK?: string;
    ST_BRIDGE_URL?: string;
    ST_BRIDGE_MANIFEST_URL?: string;
    ST_BRIDGE_ENV?: 'local' | 'prod';
    ST_BRIDGE_CACHE_BUST?: string;
    DOKUHA_APP_BASE_URL?: string;
    DOKUHA_APP_URL?: string;
    DOKUHA_STATUS_URL?: string;
    DOKUHAPlugin?: any;
  }
}
