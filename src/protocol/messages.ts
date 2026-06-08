export type DokuhaAppId = string;

export type DokuhaMessage =
  | DokuhaContainerReadyMessage
  | DokuhaAppReadyMessage
  | DokuhaOpenAppMessage
  | DokuhaRequestDataMessage
  | DokuhaRefreshMessage
  | DokuhaCommandMessage
  | DokuhaCommandResultMessage;

export interface DokuhaContainerReadyMessage {
  type: 'dokuha:container-ready';
  appId: DokuhaAppId;
  app: DokuhaRegistryApp;
}

export interface DokuhaAppReadyMessage {
  type: 'dokuha:app-ready';
  appId: DokuhaAppId;
}

export interface DokuhaOpenAppMessage {
  type: 'dokuha:open-app';
  app: DokuhaAppId;
  params?: Record<string, string | number | boolean | null | undefined>;
}

export interface DokuhaRequestDataMessage {
  type: 'dokuha:request-data';
  topic?: string;
}

export interface DokuhaRefreshMessage {
  type: 'dokuha:refresh';
  payload?: unknown;
}

export interface DokuhaCommandMessage {
  type: 'dokuha:command';
  namespace: string;
  action: string;
  payload?: unknown;
  requestId?: string;
}

export interface DokuhaCommandResultMessage {
  type: 'dokuha:command-result';
  ok: boolean;
  requestId?: string;
  payload?: unknown;
  error?: string;
}

export interface DokuhaRegistry {
  version: number;
  defaultApp?: string;
  apps: Record<string, DokuhaRegistryApp>;
}

export interface DokuhaRegistryApp {
  id: string;
  name: string;
  type: string;
  container?: string;
  entry?: string;
  status?: 'active' | 'legacy' | 'experimental' | string;
  notes?: string;
}

export function isDokuhaMessage(value: unknown): value is DokuhaMessage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'type' in value &&
      String((value as { type: unknown }).type).startsWith('dokuha:')
  );
}
