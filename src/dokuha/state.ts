export type DokuhaFamiliarityTier = 'low' | 'mid' | 'high';
export const DOKUHA_MODES = ['normal', 'tired_mode', 'hell_mode'] as const;
export type DokuhaMode = (typeof DOKUHA_MODES)[number];
export type DokuhaAttachmentLevel = 'non_attached' | 'light_attached' | 'heavy_attached';
export type DokuhaRelationshipStage = 'neighbor' | 'friend' | 'lover';
export const DOKUHA_DISORDERS = ['asd_active', 'adhd_active', 'bpd_active', 'pmdd_active'] as const;
export type DokuhaDisorder = (typeof DOKUHA_DISORDERS)[number];
export const DOKUHA_LONG_TERM_EMOTIONS = ['depressed', 'exhausted', 'normal', 'comfortable', 'irritated', 'paralyzed'] as const;
export type DokuhaLongTermEmotion = (typeof DOKUHA_LONG_TERM_EMOTIONS)[number];
export const DOKUHA_DYNAMIC_EMOTIONS = ['normal', 'warm', 'passionate', 'slightly_cold', 'freezing_cold'] as const;
export type DokuhaDynamicEmotion = (typeof DOKUHA_DYNAMIC_EMOTIONS)[number];
export const DOKUHA_OUTFITS = ['streetwear_full', 'streetwear_inner', 'nightwear', 'underwear', 'nude'] as const;
export type DokuhaOutfit = (typeof DOKUHA_OUTFITS)[number];
export const DOKUHA_MASK_STATES = ['no_mask', 'mask_up', 'mask_down'] as const;
export type DokuhaMaskState = (typeof DOKUHA_MASK_STATES)[number];
export const DOKUHA_STACKABLE_ACCESSORIES = ['headphones'] as const;
export const DOKUHA_ACCESSORIES = [...DOKUHA_MASK_STATES, ...DOKUHA_STACKABLE_ACCESSORIES] as const;
export type DokuhaAccessory = (typeof DOKUHA_ACCESSORIES)[number];
export const DOKUHA_STANDING_MODES = ['spine', 'static'] as const;
export type DokuhaStandingMode = (typeof DOKUHA_STANDING_MODES)[number];
export const DOKUHA_EVENT_TYPES = ['none', 'daily_event', 'relationship_event', 'dokuha_crisis_event', 'pmdd_event', 'bad_luck'] as const;
export type DokuhaEventType = (typeof DOKUHA_EVENT_TYPES)[number];
export const DOKUHA_EVENT_PHASES = ['none', 'ongoing', 'end'] as const;
export type DokuhaEventPhase = (typeof DOKUHA_EVENT_PHASES)[number];
export const DOKUHA_PHYSIOLOGY_PHASES = ['follicular', 'luteal', 'pmdd_window', 'post_window'] as const;
export type DokuhaPhysiologyPhase = (typeof DOKUHA_PHYSIOLOGY_PHASES)[number];

export const DOKUHA_FAMILIARITY_SCALE = 5;
export const DOKUHA_FAMILIARITY_MAX = 500;
export const DOKUHA_FAMILIARITY_TIER_THRESHOLDS = {
  mid: 20 * DOKUHA_FAMILIARITY_SCALE,
  high: 50 * DOKUHA_FAMILIARITY_SCALE
} as const;
export const DOKUHA_RELATIONSHIP_THRESHOLDS = {
  friend: 20 * DOKUHA_FAMILIARITY_SCALE,
  lover: 30 * DOKUHA_FAMILIARITY_SCALE
} as const;
export const DOKUHA_ATTACHMENT_THRESHOLDS = {
  light_attached: 15 * DOKUHA_FAMILIARITY_SCALE,
  heavy_attached: 35 * DOKUHA_FAMILIARITY_SCALE
} as const;
export const DOKUHA_EVENT_SUMMARY_LIMIT = 6;

export const DOKUHA_PMDD_CYCLE_RULE = Object.freeze({
  cycleLengthDays: 32,
  follicularEndDay: 14,
  pmddWindowStartDay: 25,
  pmddWindowEndDay: 32,
  minCooldownHours: 36,
  followupGraceHours: 48
});

export const DOKUHA_PHYSIOLOGY_PHASE_LABELS: Record<DokuhaPhysiologyPhase, string> = {
  follicular: '卵泡期（日常）',
  luteal: '黄体期（情绪起伏）',
  pmdd_window: 'PMDD高发窗口',
  post_window: '窗口结束（需补叙）'
};

export const DOKUHA_PHYSIOLOGY_MOOD_LINES: Record<string, string> = {
  '卵泡期（日常）': 'Physiology: Stable & Chill. Energy is normal, body feels light.',
  '黄体期（情绪起伏）': 'Physiology: Unstable. Sensitive, clingy, and emotionally fragile.',
  'PMDD高发窗口': 'Physiology: CRITICAL. In pain, defensive, and completely drained.',
  '窗口结束（需补叙）': 'Physiology: Recovery. Weak, empty, and needing gentle care.'
};

export const DOKUHA_PMDD_JUDGMENTS: Record<DokuhaPhysiologyPhase, string> = {
  follicular: '❌ 当前处于生理周期前半段，禁止触发 PMDD/Hell。',
  luteal: '⚠️ 黄体期：可安排轻度波动或预兆，但不要直接进入 PMDD。',
  pmdd_window: '✓ 正处于 PMDD 高发窗口，默认进入 Hell Mode（请维持生理症状连贯性）。',
  post_window: '⚠️ 已超过 PMDD 窗口，若强行触发需先补叙缺失的症状演化。'
};

export const DOKUHA_FAMILIARITY_TIER_LABELS: Record<DokuhaFamiliarityTier, string> = {
  low: '低熟悉',
  mid: '中熟悉',
  high: '高熟悉'
};

export const DOKUHA_MODE_LABELS: Record<DokuhaMode, string> = {
  normal: '一般模式',
  tired_mode: '倦怠模式',
  hell_mode: '地狱模式'
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

export const DOKUHA_DISORDER_LABELS: Record<DokuhaDisorder, string> = {
  asd_active: 'ASD',
  adhd_active: 'ADHD',
  bpd_active: 'BPD',
  pmdd_active: 'PMDD'
};

export const DOKUHA_LONG_TERM_EMOTION_LABELS: Record<DokuhaLongTermEmotion, string> = {
  depressed: '低落',
  exhausted: '耗竭',
  normal: '平常',
  comfortable: '舒适',
  irritated: '烦躁',
  paralyzed: '麻木'
};

export const DOKUHA_DYNAMIC_EMOTION_LABELS: Record<DokuhaDynamicEmotion, string> = {
  normal: '平静',
  warm: '柔和',
  passionate: '热切',
  slightly_cold: '微冷',
  freezing_cold: '冰冷'
};

export interface DokuhaState {
  familiarity: {
    points: number;
    tier: DokuhaFamiliarityTier;
  };
  coreStates: {
    mode: DokuhaMode;
    relationshipStage: DokuhaRelationshipStage;
    attachmentLevel: DokuhaAttachmentLevel;
  };
  mentalStates: {
    disorderActive: DokuhaDisorder[];
    longTermEmotion: DokuhaLongTermEmotion;
    dynamicEmotion: DokuhaDynamicEmotion;
  };
  outfit: DokuhaOutfit;
  accessories: DokuhaAccessory[];
  current_location: string;
  current_event: {
    type: DokuhaEventType;
    name: string;
    phase: DokuhaEventPhase;
    start_time: string;
  };
  metadata: DokuhaMetadata;
  context_notes: DokuhaContextNotes;
}

export interface DokuhaMetadata {
  last_pmdd_time: string | null;
  pmdd_cycle_anchor: string | null;
  pmdd_followup_consumed: boolean;
}

export interface DokuhaEventSummary {
  id: string;
  type: DokuhaEventType;
  name: string;
  ended_at: string;
  summary: string;
  familiarity_points: number;
  relationship_stage: DokuhaRelationshipStage;
  attachment_level: DokuhaAttachmentLevel;
}

export interface DokuhaContextNotes {
  event_summaries: DokuhaEventSummary[];
  pending_event_summary: string;
  pending_new_event_hint: boolean;
}

export interface DokuhaTimeObject {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  day_of_week: string;
}

export interface DokuhaSystemState {
  current_time: DokuhaTimeObject;
  time_advance: string | null;
  time_set_to: string | null;
  event_start: {
    name: string | null;
    type: Exclude<DokuhaEventType, 'none'> | null;
  };
}

export interface DokuhaFamiliarityProfile {
  familiarityPoints: number;
  familiarityTier: DokuhaFamiliarityTier;
  attachmentLevel: DokuhaAttachmentLevel;
  relationshipStage: DokuhaRelationshipStage;
  thresholds: {
    relationship: typeof DOKUHA_RELATIONSHIP_THRESHOLDS;
    attachment: typeof DOKUHA_ATTACHMENT_THRESHOLDS;
    tier: typeof DOKUHA_FAMILIARITY_TIER_THRESHOLDS;
  };
}

export interface DokuhaPhysiologyProfile {
  cycleDay: number;
  phase: DokuhaPhysiologyPhase;
  phaseLabel: string;
  moodLine: string;
  judgment: string;
  canTrigger: boolean;
  intervalDays: number;
  cooldownHoursRemaining: number;
  cycleAnchor: string;
  lastPMDDTime: string | null;
}

export const DEFAULT_DOKUHA_STATE: DokuhaState = {
  familiarity: {
    points: 0,
    tier: 'low'
  },
  coreStates: {
    mode: 'normal',
    relationshipStage: 'neighbor',
    attachmentLevel: 'non_attached'
  },
  mentalStates: {
    disorderActive: [],
    longTermEmotion: 'normal',
    dynamicEmotion: 'slightly_cold'
  },
  outfit: 'streetwear_full',
  accessories: ['no_mask'],
  current_location: 'ApartmentHallway',
  current_event: {
    type: 'none',
    name: '',
    phase: 'none',
    start_time: ''
  },
  metadata: {
    last_pmdd_time: null,
    pmdd_cycle_anchor: '2024-04-01T20:00:00',
    pmdd_followup_consumed: false
  },
  context_notes: {
    event_summaries: [],
    pending_event_summary: '',
    pending_new_event_hint: false
  }
};

export const DEFAULT_DOKUHA_SYSTEM_STATE: DokuhaSystemState = {
  current_time: {
    year: 2024,
    month: 4,
    day: 1,
    hour: 20,
    minute: 0,
    day_of_week: '周一'
  },
  time_advance: null,
  time_set_to: null,
  event_start: {
    name: null,
    type: null
  }
};

export function deriveFamiliarityTier(points: unknown): DokuhaFamiliarityTier {
  const safePoints = clampNumber(points, 0, DOKUHA_FAMILIARITY_MAX, DEFAULT_DOKUHA_STATE.familiarity.points);
  if (safePoints >= DOKUHA_FAMILIARITY_TIER_THRESHOLDS.high) return 'high';
  if (safePoints >= DOKUHA_FAMILIARITY_TIER_THRESHOLDS.mid) return 'mid';
  return 'low';
}

export function deriveFamiliarityProfile(stateOrPoints: unknown): DokuhaFamiliarityProfile {
  const source = isRecord(stateOrPoints) ? stateOrPoints : {};
  const rawPoints = isRecord(source.familiarity)
    ? source.familiarity.points
    : source.familiarity_points ?? source.affection ?? stateOrPoints;
  const points = clampNumber(rawPoints, 0, DOKUHA_FAMILIARITY_MAX, DEFAULT_DOKUHA_STATE.familiarity.points);
  const legacyCoreStates = isRecord(source.core_states) ? source.core_states : {};
  const coreStates = isRecord(source.coreStates) ? source.coreStates : legacyCoreStates;
  return {
    familiarityPoints: points,
    familiarityTier: deriveFamiliarityTier(points),
    attachmentLevel: normalizeChoice(coreStates.attachmentLevel, ['non_attached', 'light_attached', 'heavy_attached'] as const, DEFAULT_DOKUHA_STATE.coreStates.attachmentLevel),
    relationshipStage: normalizeChoice(coreStates.relationshipStage, ['neighbor', 'friend', 'lover'] as const, DEFAULT_DOKUHA_STATE.coreStates.relationshipStage),
    thresholds: {
      relationship: DOKUHA_RELATIONSHIP_THRESHOLDS,
      attachment: DOKUHA_ATTACHMENT_THRESHOLDS,
      tier: DOKUHA_FAMILIARITY_TIER_THRESHOLDS
    }
  };
}

export const deriveAffectionProfile = deriveFamiliarityProfile;
export type DokuhaAffectionProfile = DokuhaFamiliarityProfile;

export function ensureMetadataHasPMDDAnchor(metadata: DokuhaMetadata, system: unknown = {}, nowGameDate = new Date()): DokuhaMetadata {
  if (metadata.pmdd_cycle_anchor) return metadata;
  const currentTime = isRecord(system) && isRecord(system.current_time) ? system.current_time : system;
  const currentDate = currentTime ? timeObjectToDate(currentTime) : null;
  const fallback = currentDate && !Number.isNaN(currentDate.getTime())
    ? currentDate
    : nowGameDate instanceof Date && !Number.isNaN(nowGameDate.getTime())
      ? nowGameDate
      : new Date();
  return {
    ...metadata,
    pmdd_cycle_anchor: formatMetadataTimestamp(fallback)
  };
}

export function calculatePMDDInterval(lastPMDDTime: unknown, nowGameDate = new Date()): number {
  if (!lastPMDDTime) return 999;
  const anchor = nowGameDate instanceof Date && !Number.isNaN(nowGameDate.getTime()) ? nowGameDate : new Date();
  const lastPMDD = new Date(String(lastPMDDTime));
  if (Number.isNaN(lastPMDD.getTime())) return 999;
  const diffMs = anchor.getTime() - lastPMDD.getTime();
  return Math.floor(diffMs / ONE_DAY_MS);
}

export function computePMDDCycleDay(metadata: DokuhaMetadata, nowGameDate = new Date()): { anchor: Date; cycleDay: number } {
  let anchor = metadata.pmdd_cycle_anchor ? new Date(metadata.pmdd_cycle_anchor) : null;
  if (!anchor || Number.isNaN(anchor.getTime())) {
    const fallback = metadata.last_pmdd_time ? new Date(metadata.last_pmdd_time) : nowGameDate;
    anchor = new Date(fallback.getTime() - (DOKUHA_PMDD_CYCLE_RULE.pmddWindowStartDay - 1) * ONE_DAY_MS);
  }
  const diffDays = Math.max(0, Math.floor((nowGameDate.getTime() - anchor.getTime()) / ONE_DAY_MS));
  const cycleDay = (diffDays % DOKUHA_PMDD_CYCLE_RULE.cycleLengthDays) + 1;
  return { anchor, cycleDay };
}

export function generatePMDDJudgment(metadata: DokuhaMetadata, nowGameDate = new Date(), pmddIntervalDays = calculatePMDDInterval(metadata.last_pmdd_time, nowGameDate)): DokuhaPhysiologyProfile {
  const { anchor, cycleDay } = computePMDDCycleDay(metadata, nowGameDate);
  const lastEpisode = metadata.last_pmdd_time ? new Date(metadata.last_pmdd_time) : null;
  const hoursSinceEpisode = lastEpisode && !Number.isNaN(lastEpisode.getTime())
    ? (nowGameDate.getTime() - lastEpisode.getTime()) / ONE_HOUR_MS
    : Infinity;
  const cooldownRemaining = lastEpisode
    ? Math.max(0, DOKUHA_PMDD_CYCLE_RULE.minCooldownHours - hoursSinceEpisode)
    : 0;

  let phase: DokuhaPhysiologyPhase = 'post_window';
  if (cycleDay <= DOKUHA_PMDD_CYCLE_RULE.follicularEndDay) {
    phase = 'follicular';
  } else if (cycleDay < DOKUHA_PMDD_CYCLE_RULE.pmddWindowStartDay) {
    phase = 'luteal';
  } else if (cycleDay < DOKUHA_PMDD_CYCLE_RULE.pmddWindowEndDay) {
    phase = 'pmdd_window';
  }

  const phaseLabel = DOKUHA_PHYSIOLOGY_PHASE_LABELS[phase];
  return {
    judgment: DOKUHA_PMDD_JUDGMENTS[phase],
    canTrigger: phase === 'pmdd_window',
    intervalDays: pmddIntervalDays,
    cycleDay,
    phase,
    phaseLabel,
    moodLine: DOKUHA_PHYSIOLOGY_MOOD_LINES[phaseLabel] || '',
    cooldownHoursRemaining: cooldownRemaining > 0 ? Math.ceil(cooldownRemaining) : 0,
    cycleAnchor: formatMetadataTimestamp(anchor),
    lastPMDDTime: metadata.last_pmdd_time
  };
}

export function derivePhysiologyProfile(stateOrDokuha: unknown, systemOrTime: unknown = {}): DokuhaPhysiologyProfile {
  const state = normalizeDokuhaState(stateOrDokuha);
  const system = normalizeDokuhaSystemState(
    isRecord(systemOrTime) && isRecord(systemOrTime.current_time)
      ? systemOrTime
      : { current_time: systemOrTime }
  );
  const nowGameDate = timeObjectToDate(system.current_time);
  const metadata = ensureMetadataHasPMDDAnchor(state.metadata, system, nowGameDate);
  const intervalDays = calculatePMDDInterval(metadata.last_pmdd_time, nowGameDate);
  return generatePMDDJudgment(metadata, nowGameDate, intervalDays);
}

export function normalizeDokuhaState(value: unknown): DokuhaState {
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
        ['neighbor', 'friend', 'lover'] as const,
        DEFAULT_DOKUHA_STATE.coreStates.relationshipStage
      ),
      attachmentLevel: normalizeChoice(
        coreStates.attachmentLevel ?? coreStates.attachment_level,
        ['non_attached', 'light_attached', 'heavy_attached'] as const,
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

export function normalizeDokuhaSystemState(value: unknown): DokuhaSystemState {
  const source = isRecord(value) ? value : {};
  const currentTime = isRecord(source.current_time) ? source.current_time : {};
  const eventStart = isRecord(source.event_start) ? source.event_start : {};
  const eventType = normalizeChoice(
    eventStart.type,
    ['daily_event', 'relationship_event', 'dokuha_crisis_event', 'pmdd_event', 'bad_luck'] as const,
    null as never
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

export function normalizeFamiliarity(source: Record<string, unknown>): DokuhaState['familiarity'] {
  const rawFamiliarity = isRecord(source.familiarity) ? source.familiarity : {};
  const rawPoints = rawFamiliarity.points ?? source.familiarity_points ?? source.affection;
  const points = clampNumber(rawPoints, 0, DOKUHA_FAMILIARITY_MAX, DEFAULT_DOKUHA_STATE.familiarity.points);
  return {
    points,
    tier: deriveFamiliarityTier(points)
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeNonEmptyString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function normalizeNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function normalizeMetadata(value: unknown): DokuhaMetadata {
  const source = isRecord(value) ? value : {};
  return {
    last_pmdd_time: normalizeNullableString(source.last_pmdd_time ?? source.lastPMDDTime),
    pmdd_cycle_anchor: normalizeNullableString(source.pmdd_cycle_anchor ?? source.pmddCycleAnchor)
      || DEFAULT_DOKUHA_STATE.metadata.pmdd_cycle_anchor,
    pmdd_followup_consumed: source.pmdd_followup_consumed === true || source.pmddFollowupConsumed === true
  };
}

export function normalizeContextNotes(value: unknown): DokuhaContextNotes {
  const source = isRecord(value) ? value : {};
  const rawSummaries = Array.isArray(source.event_summaries)
    ? source.event_summaries
    : Array.isArray(source.eventSummaries)
      ? source.eventSummaries
      : [];
  const eventSummaries = rawSummaries
    .map((item) => normalizeEventSummary(item))
    .filter((item): item is DokuhaEventSummary => Boolean(item))
    .slice(-DOKUHA_EVENT_SUMMARY_LIMIT);
  return {
    event_summaries: eventSummaries,
    pending_event_summary: sanitizeContextNote(source.pending_event_summary ?? source.pendingEventSummary),
    pending_new_event_hint: source.pending_new_event_hint === true || source.pendingNewEventHint === true
  };
}

export function normalizeEventSummary(value: unknown): DokuhaEventSummary | null {
  const source = isRecord(value) ? value : {};
  const type = normalizeChoice(source.type, DOKUHA_EVENT_TYPES, 'daily_event');
  const summary = sanitizeContextNote(source.summary);
  if (!summary) return null;
  return {
    id: normalizeNonEmptyString(source.id, makeEventSummaryId(source.name, type, source.ended_at)),
    type,
    name: normalizeNonEmptyString(source.name, 'UnnamedEvent'),
    ended_at: normalizeNonEmptyString(source.ended_at ?? source.endedAt, ''),
    summary,
    familiarity_points: clampNumber(source.familiarity_points ?? source.familiarityPoints, 0, DOKUHA_FAMILIARITY_MAX, 0),
    relationship_stage: normalizeChoice(
      source.relationship_stage ?? source.relationshipStage,
      ['neighbor', 'friend', 'lover'] as const,
      DEFAULT_DOKUHA_STATE.coreStates.relationshipStage
    ),
    attachment_level: normalizeChoice(
      source.attachment_level ?? source.attachmentLevel,
      ['non_attached', 'light_attached', 'heavy_attached'] as const,
      DEFAULT_DOKUHA_STATE.coreStates.attachmentLevel
    )
  };
}

export function sanitizeContextNote(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[<>]/g, (char) => (char === '<' ? '‹' : '›'))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 420);
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.max(min, Math.min(max, Math.round(next)));
}

export function normalizeChoice<const T extends readonly string[]>(value: unknown, choices: T, fallback: T[number]): T[number] {
  return typeof value === 'string' && choices.includes(value) ? value : fallback;
}

export function normalizeDisorderActive(value: unknown): DokuhaDisorder[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string' && value !== 'none'
      ? value.split(/[,| ]+/)
      : [];
  const result: DokuhaDisorder[] = [];
  raw.forEach((item) => {
    if (typeof item !== 'string') return;
    if (!DOKUHA_DISORDERS.includes(item as DokuhaDisorder)) return;
    if (!result.includes(item as DokuhaDisorder)) result.push(item as DokuhaDisorder);
  });
  return result;
}

export function normalizeAccessories(value: unknown): DokuhaAccessory[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,| ]+/)
      : [];

  let maskState: DokuhaMaskState = 'no_mask';
  let hasHeadphones = false;

  raw.forEach((item) => {
    if (typeof item !== 'string') return;
    if (DOKUHA_MASK_STATES.includes(item as DokuhaMaskState)) {
      maskState = item as DokuhaMaskState;
      return;
    }
    if (item === 'headphones') hasHeadphones = true;
  });

  return hasHeadphones ? [maskState, 'headphones'] : [maskState];
}

export function normalizeTimeObject(value: unknown): DokuhaTimeObject {
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

export function normalizeCurrentEvent(value: unknown): DokuhaState['current_event'] {
  const source = isRecord(value) ? value : {};
  const type = normalizeChoice(source.type, DOKUHA_EVENT_TYPES, DEFAULT_DOKUHA_STATE.current_event.type);
  const isNone = type === 'none';
  return {
    type,
    name: isNone ? '' : normalizeNonEmptyString(source.name, DEFAULT_DOKUHA_STATE.current_event.name),
    phase: isNone
      ? 'none'
      : normalizeChoice(source.phase, DOKUHA_EVENT_PHASES, DEFAULT_DOKUHA_STATE.current_event.phase),
    start_time: isNone ? '' : normalizeNonEmptyString(source.start_time ?? source.startTime, '')
  };
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export function timeObjectToDate(value: unknown): Date {
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

export function formatMetadataTimestamp(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function makeEventSummaryId(name: unknown, type: unknown, endedAt: unknown): string {
  return [name, type, endedAt]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(':')
    .replace(/[^\w:.-]+/g, '-')
    .slice(0, 120) || 'event-summary';
}
