export const DOKUHA_STREAM_STATUSES = ['offline', 'online', 'brb', 'ending'] as const;
export type DokuhaStreamStatus = (typeof DOKUHA_STREAM_STATUSES)[number];
export type DokuhaAffectionTier = 'low' | 'mid' | 'high';
export type DokuhaAttachmentLevel = 'non_attached' | 'light_attached' | 'heavy_attached';
export type DokuhaRelationshipStage = 'neighbor' | 'friend' | 'lover';

export const DOKUHA_STREAM_STATUS_LABELS: Record<DokuhaStreamStatus, string> = {
  offline: '离线',
  online: '直播中',
  brb: '暂离',
  ending: '收尾'
};

export const DOKUHA_AFFECTION_TIER_LABELS: Record<DokuhaAffectionTier, string> = {
  low: '低熟悉',
  mid: '中熟悉',
  high: '高熟悉'
};

export const DOKUHA_ATTACHMENT_LEVEL_LABELS: Record<DokuhaAttachmentLevel, string> = {
  non_attached: '非依恋',
  light_attached: '轻度依恋',
  heavy_attached: '重度依恋'
};

export const DOKUHA_RELATIONSHIP_STAGE_LABELS: Record<DokuhaRelationshipStage, string> = {
  neighbor: '邻人',
  friend: '朋友',
  lover: '恋人'
};

export interface DokuhaState {
  affection: number;
  energy: number;
  mood: number;
  streamStatus: DokuhaStreamStatus;
  location: string;
  nowPlaying: string;
  hostName: string;
  handle: string;
  statusComment: string;
}

export interface DokuhaAffectionProfile {
  affection: number;
  affectionTier: DokuhaAffectionTier;
  attachmentLevel: DokuhaAttachmentLevel;
  relationshipStage: DokuhaRelationshipStage;
}

export const DEFAULT_DOKUHA_STATE: DokuhaState = {
  affection: 0,
  energy: 72,
  mood: 68,
  streamStatus: 'online',
  location: 'LOCAL HOST',
  nowPlaying: 'Night Drive / 88%',
  hostName: '狐坂 毒羽',
  handle: 'LOSTRAB_722',
  statusComment: '连接稳定，直播协议保持在线。'
};

export function deriveAffectionProfile(stateOrAffection: unknown): DokuhaAffectionProfile {
  const source = isRecord(stateOrAffection) ? stateOrAffection.affection : stateOrAffection;
  const affection = clampNumber(source, 0, 255, DEFAULT_DOKUHA_STATE.affection);
  return {
    affection,
    affectionTier: affection >= 200 ? 'high' : affection >= 80 ? 'mid' : 'low',
    attachmentLevel: affection >= 140 ? 'heavy_attached' : affection >= 60 ? 'light_attached' : 'non_attached',
    relationshipStage: affection >= 120 ? 'lover' : affection >= 80 ? 'friend' : 'neighbor'
  };
}

export function normalizeDokuhaState(value: unknown): DokuhaState {
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.max(min, Math.min(max, Math.round(next)));
}

export function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function normalizeStreamStatus(
  value: unknown,
  fallback: DokuhaStreamStatus = DEFAULT_DOKUHA_STATE.streamStatus
): DokuhaStreamStatus {
  return typeof value === 'string' && DOKUHA_STREAM_STATUSES.includes(value as DokuhaStreamStatus)
    ? value as DokuhaStreamStatus
    : fallback;
}
