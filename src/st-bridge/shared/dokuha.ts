import {
  DEFAULT_DOKUHA_STATE,
  DOKUHA_AFFECTION_TIER_LABELS,
  DOKUHA_ATTACHMENT_LEVEL_LABELS,
  DOKUHA_RELATIONSHIP_STAGE_LABELS,
  DOKUHA_STREAM_STATUS_LABELS,
  DOKUHA_STREAM_STATUSES,
  deriveAffectionProfile,
  normalizeDokuhaState,
  normalizeStreamStatus,
  type DokuhaAffectionProfile,
  type DokuhaAffectionTier,
  type DokuhaAttachmentLevel,
  type DokuhaRelationshipStage,
  type DokuhaStreamStatus,
  type DokuhaState
} from '../../dokuha/state';

export {
  DEFAULT_DOKUHA_STATE,
  DOKUHA_AFFECTION_TIER_LABELS,
  DOKUHA_ATTACHMENT_LEVEL_LABELS,
  DOKUHA_RELATIONSHIP_STAGE_LABELS,
  DOKUHA_STREAM_STATUS_LABELS,
  DOKUHA_STREAM_STATUSES,
  deriveAffectionProfile,
  normalizeDokuhaState,
  normalizeStreamStatus,
  type DokuhaAffectionProfile,
  type DokuhaAffectionTier,
  type DokuhaAttachmentLevel,
  type DokuhaRelationshipStage,
  type DokuhaStreamStatus,
  type DokuhaState
};

export const DOKUHA_STAT_KEY = 'stat_data';
export const DOKUHA_NAMESPACE = 'dokuha';

export const DOKUHA_ALLOWED_FIELD_PATHS = [
  '/dokuha/affection',
  '/dokuha/energy',
  '/dokuha/mood',
  '/dokuha/streamStatus',
  '/dokuha/location',
  '/dokuha/nowPlaying',
  '/dokuha/hostName',
  '/dokuha/handle',
  '/dokuha/statusComment'
] as const;

export function cloneJson<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (_) {
    return fallback;
  }
}

export function makeDefaultDokuhaState(): DokuhaState {
  return cloneJson(DEFAULT_DOKUHA_STATE, DEFAULT_DOKUHA_STATE);
}
