/**
 * DOKUHA minimal state replay runtime.
 */
import {
  DOKUHA_ALLOWED_FIELD_PATHS,
  DOKUHA_EVENT_SUMMARY_LIMIT,
  DOKUHA_NAMESPACE,
  DOKUHA_PMDD_CYCLE_RULE,
  DOKUHA_SYSTEM_ALLOWED_FIELD_PATHS,
  DOKUHA_STAT_KEY,
  cloneJson,
  normalizeDokuhaState as normalizeSharedDokuhaState,
  normalizeDokuhaSystemState as normalizeSharedDokuhaSystemState,
  sanitizeContextNote
} from '../../shared/dokuha';

(function () {
  'use strict';

  const CURRENT_ROOT = typeof window !== 'undefined' ? window : globalThis;

  function resolveBridgeHost() {
    try { if (CURRENT_ROOT.DOKUHA_ST_HOST) return CURRENT_ROOT.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.DOKUHA_ST_HOST_ROOT?.DOKUHA_ST_HOST) return CURRENT_ROOT.DOKUHA_ST_HOST_ROOT.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.parent?.DOKUHA_ST_HOST) return CURRENT_ROOT.parent.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.top?.DOKUHA_ST_HOST) return CURRENT_ROOT.top.DOKUHA_ST_HOST; } catch (_) {}
    return {};
  }

  const BRIDGE_HOST = resolveBridgeHost();
  const ROOT = BRIDGE_HOST.apiRoot || CURRENT_ROOT.DOKUHA_ST_API_ROOT || CURRENT_ROOT.DOKUHA_ST_HOST_ROOT || CURRENT_ROOT;
  const RUNTIME = ROOT.DOKUHAMainRuntime || CURRENT_ROOT.DOKUHAMainRuntime || {};
  ROOT.DOKUHAMainRuntime = RUNTIME;
  CURRENT_ROOT.DOKUHAMainRuntime = RUNTIME;

  const STAT_KEY = DOKUHA_STAT_KEY;
  const DOKUHA_KEY = DOKUHA_NAMESPACE;
  const SYSTEM_KEY = 'system';
  const REPLAY_PREFIX = 'DOKUHA_REPLAY';
  const ALLOWED_FIELD_PATHS = [...DOKUHA_ALLOWED_FIELD_PATHS, ...DOKUHA_SYSTEM_ALLOWED_FIELD_PATHS];
  const EVENT_TYPES = ['daily_event', 'relationship_event', 'dokuha_crisis_event', 'pmdd_event', 'bad_luck'];
  const MODE_ROLL_THRESHOLDS = {
    mid: 75,
    late: 175
  };
  const MODE_ROLL_TABLES = {
    early: [
      { mode: 'normal', weight: 60 },
      { mode: 'tired_mode', weight: 35 },
      { mode: 'hell_mode', weight: 5 }
    ],
    mid: [
      { mode: 'normal', weight: 45 },
      { mode: 'tired_mode', weight: 45 },
      { mode: 'hell_mode', weight: 10 }
    ],
    late: [
      { mode: 'normal', weight: 40 },
      { mode: 'tired_mode', weight: 45 },
      { mode: 'hell_mode', weight: 15 }
    ]
  };
  const TEMPORAL_REPLAY_RETRY_DELAYS = [250, 750, 1500, 3000, 5000];
  const TEMPORAL_REPLAY_MAX_ATTEMPTS = TEMPORAL_REPLAY_RETRY_DELAYS.length + 1;
  let temporalSyncDepth = 0;
  let temporalReplayFlushPromise: Promise<void> | null = null;
  let temporalReplayRetryTimer: any = null;
  const temporalReplayQueue = new Map<string, any>();

  function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value, fallback: any = null): any {
    return cloneJson(value, fallback);
  }

  function normalizeDokuhaState(value) {
    if (typeof ROOT.DOKUHASchemaRuntime?.normalizeDokuhaState === 'function') {
      return ROOT.DOKUHASchemaRuntime.normalizeDokuhaState(value);
    }
    if (typeof ROOT.STBridge?.mvuz?.normalize === 'function') {
      return ROOT.STBridge.mvuz.normalize('dokuha', value);
    }
    return normalizeSharedDokuhaState(value);
  }

  function normalizeDokuhaSystemState(value) {
    if (typeof ROOT.DOKUHASchemaRuntime?.normalizeDokuhaSystemState === 'function') {
      return ROOT.DOKUHASchemaRuntime.normalizeDokuhaSystemState(value);
    }
    return normalizeSharedDokuhaSystemState(value);
  }

  function dateToTimeObject(date) {
    const dayOfWeekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      day_of_week: dayOfWeekMap[date.getDay()]
    };
  }

  function timeObjectToDate(time) {
    const currentTime = normalizeDokuhaSystemState({ current_time: time }).current_time;
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

  function parseTimeAdvance(text) {
    if (!text) return null;
    const normalized = String(text).toLowerCase().trim();
    const match = normalized.match(/^(\d+)\s*(min|hr|day|week|month)s?$/);
    if (!match) return null;
    const value = Number.parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = { min: 1, hr: 60, day: 1440, week: 10080, month: 43200 };
    return value * multipliers[unit];
  }

  function parseTimeSetTo(currentTime, text) {
    if (!text) return null;
    const value = String(text).trim();
    const baseTime = normalizeDokuhaSystemState({ current_time: currentTime }).current_time;

    let match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
    if (match) {
      const year = Number.parseInt(match[1], 10);
      const month = Number.parseInt(match[2], 10);
      const day = Number.parseInt(match[3], 10);
      const hour = Number.parseInt(match[4], 10);
      const minute = Number.parseInt(match[5], 10);
      if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
      return dateToTimeObject(new Date(year, month - 1, day, hour, minute));
    }

    match = value.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const hour = Number.parseInt(match[1], 10);
      const minute = Number.parseInt(match[2], 10);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
      return dateToTimeObject(new Date(baseTime.year, baseTime.month - 1, baseTime.day, hour, minute));
    }

    match = value.match(/^D\+(\d+)\s+(\d{1,2}):(\d{2})$/i);
    if (match) {
      const daysToAdd = Number.parseInt(match[1], 10);
      const hour = Number.parseInt(match[2], 10);
      const minute = Number.parseInt(match[3], 10);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
      const date = new Date(baseTime.year, baseTime.month - 1, baseTime.day, hour, minute);
      date.setDate(date.getDate() + daysToAdd);
      return dateToTimeObject(date);
    }

    match = value.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2}):(\d{2})$/i);
    if (match) {
      const dayNameMap = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
      const targetDayOfWeek = dayNameMap[match[1].toLowerCase()];
      const hour = Number.parseInt(match[2], 10);
      const minute = Number.parseInt(match[3], 10);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
      const currentDate = timeObjectToDate(baseTime);
      const currentDayOfWeek = currentDate.getDay();
      let daysToAdd = targetDayOfWeek - currentDayOfWeek;
      if (daysToAdd < 0) {
        daysToAdd += 7;
      } else if (daysToAdd === 0) {
        const targetMinutes = hour * 60 + minute;
        const currentMinutes = (baseTime.hour || 0) * 60 + (baseTime.minute || 0);
        if (targetMinutes <= currentMinutes) daysToAdd = 7;
      }
      const targetDate = new Date(baseTime.year, baseTime.month - 1, baseTime.day, hour, minute);
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      return dateToTimeObject(targetDate);
    }

    return null;
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function formatLocalISOFromTime(time) {
    const currentTime = normalizeDokuhaSystemState({ current_time: time }).current_time;
    return `${currentTime.year}-${pad2(currentTime.month)}-${pad2(currentTime.day)}T${pad2(currentTime.hour)}:${pad2(currentTime.minute)}:00`;
  }

  function makeClearedEventStart() {
    return { name: null, type: null };
  }

  function makeEmptyCurrentEvent() {
    return { type: 'none', name: '', phase: 'none', start_time: '' };
  }

  function sanitizeEventSummaryId(value) {
    return String(value || '')
      .trim()
      .replace(/[^\w:.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'event-summary';
  }

  function makeEventSummaryEntry(state, system, event) {
    const contextNotes = isObject(state?.context_notes) ? state.context_notes : {};
    const summary = sanitizeContextNote(contextNotes.pending_event_summary)
      || sanitizeContextNote(`${event.name || event.type || 'CurrentEvent'} ended.`);
    const endedAt = formatLocalISOFromTime(system.current_time);
    const type = event.type || 'daily_event';
    const name = event.name || 'UnnamedEvent';
    return {
      id: sanitizeEventSummaryId(`${name}:${type}:${endedAt}`),
      type,
      name,
      ended_at: endedAt,
      summary,
      familiarity_points: Math.max(0, Math.min(500, Math.round(Number(state?.familiarity?.points) || 0))),
      relationship_stage: state?.coreStates?.relationshipStage || 'neighbor',
      attachment_level: state?.coreStates?.attachmentLevel || 'non_attached'
    };
  }

  function closeCurrentEventWithSummary(state, system) {
    const event = isObject(state?.current_event) ? state.current_event : {};
    if (event.phase !== 'end') return false;

    const contextNotes = isObject(state.context_notes) ? state.context_notes : {};
    const previousSummaries = Array.isArray(contextNotes.event_summaries) ? contextNotes.event_summaries : [];
    const nextSummaries = [
      ...previousSummaries,
      makeEventSummaryEntry(state, system, event)
    ].slice(-DOKUHA_EVENT_SUMMARY_LIMIT);

    state.context_notes = {
      ...contextNotes,
      event_summaries: nextSummaries,
      pending_event_summary: '',
      pending_new_event_hint: true
    };
    state.current_event = makeEmptyCurrentEvent();
    return true;
  }

  function hasPMDDActive(state) {
    const disorders = Array.isArray(state?.mentalStates?.disorderActive)
      ? state.mentalStates.disorderActive
      : [];
    return disorders.includes('pmdd_active');
  }

  function shouldStampPMDDTime(state, system) {
    if (!hasPMDDActive(state)) return false;
    const metadata = isObject(state?.metadata) ? state.metadata : {};
    const lastPMDDTime = typeof metadata.last_pmdd_time === 'string' ? metadata.last_pmdd_time.trim() : '';
    if (!lastPMDDTime) return true;
    const lastDate = new Date(lastPMDDTime);
    if (Number.isNaN(lastDate.getTime())) return true;
    const currentDate = timeObjectToDate(system?.current_time);
    const hoursSinceEpisode = (currentDate.getTime() - lastDate.getTime()) / (60 * 60 * 1000);
    return hoursSinceEpisode >= DOKUHA_PMDD_CYCLE_RULE.minCooldownHours;
  }

  function syncPMDDMetadata(state, system) {
    if (!shouldStampPMDDTime(state, system)) return false;
    state.metadata = {
      ...(isObject(state.metadata) ? state.metadata : {}),
      last_pmdd_time: formatLocalISOFromTime(system.current_time),
      pmdd_followup_consumed: false
    };
    return true;
  }

  function makeDateKey(time) {
    const currentTime = normalizeDokuhaSystemState({ current_time: time }).current_time;
    return `${currentTime.year}-${pad2(currentTime.month)}-${pad2(currentTime.day)}`;
  }

  function hasDateAdvanced(beforeTime, afterTime) {
    const beforeDate = timeObjectToDate(beforeTime);
    const afterDate = timeObjectToDate(afterTime);
    return afterDate.getFullYear() !== beforeDate.getFullYear()
      || afterDate.getMonth() !== beforeDate.getMonth()
      || afterDate.getDate() !== beforeDate.getDate();
  }

  function getModeRollStage(points) {
    const familiarityPoints = Math.max(0, Math.min(500, Math.round(Number(points) || 0)));
    if (familiarityPoints >= MODE_ROLL_THRESHOLDS.late) return 'late';
    if (familiarityPoints >= MODE_ROLL_THRESHOLDS.mid) return 'mid';
    return 'early';
  }

  function rollModeForFamiliarity(points, randomValue = Math.random()) {
    const stage = getModeRollStage(points);
    const table = MODE_ROLL_TABLES[stage] || MODE_ROLL_TABLES.early;
    const total = table.reduce((sum, item) => sum + item.weight, 0);
    let cursor = Math.max(0, Math.min(0.999999, Number(randomValue) || 0)) * total;
    for (const item of table) {
      cursor -= item.weight;
      if (cursor < 0) return { mode: item.mode, stage };
    }
    return { mode: table[table.length - 1].mode, stage };
  }

  function areJsonValuesEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function readJsonPointer(root, pointer) {
    if (!pointer || pointer === '/') return root;
    const parts = String(pointer).split('/').slice(1).map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
    let current = root;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }

  function buildReplayPatch(op, path, value) {
    const patch: any = { op, path };
    if (op !== 'remove') patch.value = clone(value, value);
    return patch;
  }

  function buildDokuhaFieldPatch(path, beforeValue, afterValue) {
    if (beforeValue === undefined) return buildReplayPatch('add', path, afterValue);
    if (path === '/dokuha/familiarity/points') {
      const beforeNumber = Number(beforeValue);
      const afterNumber = Number(afterValue);
      if (Number.isFinite(beforeNumber) && Number.isFinite(afterNumber)) {
        return buildReplayPatch('delta', path, Math.round(afterNumber) - Math.round(beforeNumber));
      }
    }
    return buildReplayPatch('replace', path, afterValue);
  }

  function buildDokuhaStatePatches(beforeStatData, afterStatData) {
    const beforeDokuha = isObject(beforeStatData?.[DOKUHA_KEY]) ? beforeStatData[DOKUHA_KEY] : null;
    const hasAfterDokuha = isObject(afterStatData?.[DOKUHA_KEY]);
    const afterDokuha = hasAfterDokuha ? normalizeDokuhaState(afterStatData?.[DOKUHA_KEY]) : null;
    const patches: any[] = [];
    if (hasAfterDokuha && !beforeDokuha) {
      patches.push(buildReplayPatch('add', '/dokuha', afterDokuha));
    }

    const beforeSystem = isObject(beforeStatData?.[SYSTEM_KEY]) ? beforeStatData[SYSTEM_KEY] : null;
    const hasAfterSystem = isObject(afterStatData?.[SYSTEM_KEY]);
    const afterSystem = hasAfterSystem ? normalizeDokuhaSystemState(afterStatData?.[SYSTEM_KEY]) : null;
    if (hasAfterSystem && !beforeSystem) {
      patches.push(buildReplayPatch('add', '/system', afterSystem));
    }

    const normalizedAfterStatData = {
      ...afterStatData,
      ...(hasAfterDokuha ? { [DOKUHA_KEY]: afterDokuha } : {}),
      ...(hasAfterSystem ? { [SYSTEM_KEY]: afterSystem } : {})
    };
    for (const path of ALLOWED_FIELD_PATHS) {
      if (path === '/system') continue;
      if (path.startsWith('/dokuha/') && !beforeDokuha) continue;
      if (path.startsWith('/system/') && !beforeSystem) continue;
      const beforeValue = readJsonPointer(beforeStatData, path);
      const afterValue = readJsonPointer(normalizedAfterStatData, path);
      if (afterValue === undefined || areJsonValuesEqual(beforeValue, afterValue)) continue;
      patches.push(buildDokuhaFieldPatch(path, beforeValue, afterValue));
    }
    return patches;
  }

  function buildDokuhaValuePatches(statData) {
    const patches: any[] = [];
    if (isObject(statData?.[DOKUHA_KEY])) {
      patches.push(buildReplayPatch('add', '/dokuha', normalizeDokuhaState(statData?.[DOKUHA_KEY])));
    }
    if (isObject(statData?.[SYSTEM_KEY])) {
      patches.push(buildReplayPatch('add', '/system', normalizeDokuhaSystemState(statData?.[SYSTEM_KEY])));
    }
    return patches;
  }

  function applyTemporalTransitionToStatData(statData) {
    if (!isObject(statData)) return null;
    const beforeDokuha = normalizeDokuhaState(statData[DOKUHA_KEY]);
    const beforeSystem = normalizeDokuhaSystemState(statData[SYSTEM_KEY]);
    const nextDokuha = clone(beforeDokuha, {});
    const nextSystem = clone(beforeSystem, {});
    let changed = false;
    let timeChanged = false;

    if (beforeSystem.time_advance) {
      const minutesToAdd = parseTimeAdvance(beforeSystem.time_advance);
      if (minutesToAdd) {
        const date = timeObjectToDate(beforeSystem.current_time);
        date.setMinutes(date.getMinutes() + minutesToAdd);
        nextSystem.current_time = dateToTimeObject(date);
        timeChanged = true;
      }
      nextSystem.time_advance = null;
      changed = true;
    } else if (beforeSystem.time_set_to) {
      const targetTime = parseTimeSetTo(beforeSystem.current_time, beforeSystem.time_set_to);
      if (targetTime) {
        nextSystem.current_time = targetTime;
        timeChanged = true;
      }
      nextSystem.time_set_to = null;
      changed = true;
    }

    if (timeChanged && hasDateAdvanced(beforeSystem.current_time, nextSystem.current_time)) {
      const familiarityPoints = nextDokuha.familiarity?.points ?? beforeDokuha.familiarity?.points ?? 0;
      const rolled = rollModeForFamiliarity(familiarityPoints);
      nextDokuha.coreStates = {
        ...(isObject(nextDokuha.coreStates) ? nextDokuha.coreStates : {}),
        mode: rolled.mode
      };
      try {
        ROOT.__DOKUHA_LAST_MODE_ROLL__ = {
          date: makeDateKey(nextSystem.current_time),
          familiarityPoints,
          stage: rolled.stage,
          mode: rolled.mode,
          rolledAt: new Date().toISOString()
        };
      } catch (_) {}
      changed = true;
    }

    const eventStart = isObject(beforeSystem.event_start) ? beforeSystem.event_start : {};
    const eventName = typeof eventStart.name === 'string' ? eventStart.name.trim() : '';
    const eventType = typeof eventStart.type === 'string' ? eventStart.type.trim() : '';
    if (eventName || eventType) {
      if (eventName && EVENT_TYPES.includes(eventType)) {
        nextDokuha.current_event = {
          name: eventName,
          type: eventType,
          phase: 'ongoing',
          start_time: formatLocalISOFromTime(nextSystem.current_time)
        };
        nextDokuha.context_notes = {
          ...(isObject(nextDokuha.context_notes) ? nextDokuha.context_notes : {}),
          pending_new_event_hint: false
        };
      }
      nextSystem.event_start = makeClearedEventStart();
      changed = true;
    }

    if (closeCurrentEventWithSummary(nextDokuha, nextSystem)) {
      changed = true;
    }

    if (syncPMDDMetadata(nextDokuha, nextSystem)) {
      changed = true;
    }

    if (!changed) return null;
    const transitioned = {
      ...statData,
      [DOKUHA_KEY]: normalizeDokuhaState(nextDokuha),
      [SYSTEM_KEY]: normalizeDokuhaSystemState(nextSystem)
    };
    const patches = buildDokuhaStatePatches(statData, transitioned);
    if (!patches.length) return null;
    return {
      beforeStatData: clone(statData, {}),
      afterStatData: transitioned,
      patches
    };
  }

  function computeTemporalTransition(nextVariables) {
    const nextStatData = isObject(nextVariables?.[STAT_KEY]) ? nextVariables[STAT_KEY] : null;
    if (!nextStatData) return null;
    return applyTemporalTransitionToStatData(nextStatData);
  }

  function formatTemporalOperationId(transition) {
    const time = normalizeDokuhaSystemState(transition?.afterStatData?.[SYSTEM_KEY]).current_time;
    return `system:time:${time.year}${pad2(time.month)}${pad2(time.day)}-${pad2(time.hour)}${pad2(time.minute)}`;
  }

  function cloneTemporalTransition(transition, reason = 'event') {
    const operationId = formatTemporalOperationId(transition);
    const messageId = resolveReplayMessageId({});
    const hasMessageId = messageId !== null && messageId !== undefined;
    return {
      operationId,
      reason,
      attempts: 0,
      messageId: hasMessageId && Number.isFinite(Number(messageId)) && Number(messageId) >= 0 ? Math.round(Number(messageId)) : null,
      beforeStatData: clone(transition.beforeStatData, {}),
      afterStatData: clone(transition.afterStatData, {}),
      patches: clone(transition.patches, [])
    };
  }

  async function writeTemporalReplay(transition) {
    return commitDokuhaReplayPatch({
      messageId: transition.messageId,
      operationId: transition.operationId,
      patches: transition.patches,
      refresh: 'affected',
      suppressTemporalSync: true
    });
  }

  function scheduleTemporalReplayFlush(delay = TEMPORAL_REPLAY_RETRY_DELAYS[0]) {
    if (temporalReplayRetryTimer) return;
    temporalReplayRetryTimer = setTimeout(() => {
      temporalReplayRetryTimer = null;
      flushTemporalReplayQueue();
    }, delay);
  }

  function queueTemporalReplay(transition, reason = 'event') {
    const entry = cloneTemporalTransition(transition, reason);
    const previous = temporalReplayQueue.get(entry.operationId);
    if (previous) {
      entry.attempts = previous.attempts || 0;
      entry.messageId = previous.messageId ?? entry.messageId;
    }
    temporalReplayQueue.set(entry.operationId, entry);
    scheduleTemporalReplayFlush();
    return entry;
  }

  function getNextTemporalReplayDelay() {
    let attempts = 0;
    temporalReplayQueue.forEach((entry) => {
      attempts = Math.max(attempts, Number(entry?.attempts) || 0);
    });
    const index = Math.max(0, Math.min(TEMPORAL_REPLAY_RETRY_DELAYS.length - 1, attempts));
    return TEMPORAL_REPLAY_RETRY_DELAYS[index];
  }

  async function flushTemporalReplayQueue() {
    if (temporalReplayFlushPromise) return temporalReplayFlushPromise;
    temporalReplayFlushPromise = (async () => {
      for (const entry of Array.from(temporalReplayQueue.values())) {
        if (!temporalReplayQueue.has(entry.operationId)) continue;
        entry.attempts = (Number(entry.attempts) || 0) + 1;
        const result = await writeTemporalReplay(entry);
        try { ROOT.__DOKUHA_LAST_TEMPORAL_REPLAY__ = { ...entry, result }; } catch (_) {}
        if (result?.ok) {
          temporalReplayQueue.delete(entry.operationId);
          notifyStateChanged(normalizeDokuhaState(entry.afterStatData?.[DOKUHA_KEY]));
          continue;
        }
        if (entry.attempts >= TEMPORAL_REPLAY_MAX_ATTEMPTS) {
          temporalReplayQueue.delete(entry.operationId);
          console.warn('[DOKUHA Time System] temporal replay skipped because the context block could not be written:', result);
          continue;
        }
        temporalReplayQueue.set(entry.operationId, entry);
      }
    })().finally(() => {
      temporalReplayFlushPromise = null;
      if (temporalReplayQueue.size > 0) {
        scheduleTemporalReplayFlush(getNextTemporalReplayDelay());
      }
    });
    return temporalReplayFlushPromise;
  }

  function clearTemporalReplayQueue() {
    temporalReplayQueue.clear();
    if (temporalReplayRetryTimer) {
      clearTimeout(temporalReplayRetryTimer);
      temporalReplayRetryTimer = null;
    }
  }

  function resolveEventOn() {
    try {
      if (typeof eventOn === 'function') return eventOn;
    } catch (_) {}
    try {
      if (typeof ROOT.eventOn === 'function') return ROOT.eventOn.bind(ROOT);
    } catch (_) {}
    return null;
  }

  function resolveTavernEventName(name, fallback) {
    try {
      const value = tavern_events?.[name];
      if (typeof value === 'string' && value) return value;
    } catch (_) {}
    try {
      const value = ROOT.tavern_events?.[name];
      if (typeof value === 'string' && value) return value;
    } catch (_) {}
    return fallback;
  }

  function startTemporalSync() {
    const eventOnApi = resolveEventOn();
    if (!eventOnApi) return null;
    const stops: any[] = [];
    const handler = async (nextVariables) => {
      try {
        if (temporalSyncDepth > 0) return;
        const transition = computeTemporalTransition(nextVariables);
        if (!transition) return;
        queueTemporalReplay(transition, 'mag_variable_update_ended');
      } catch (error) {
        console.warn('[DOKUHA Time System] temporal sync failed:', error);
      }
    };
    const flushHandler = () => {
      if (temporalReplayQueue.size > 0) scheduleTemporalReplayFlush(50);
    };
    const bind = (eventName, listener) => {
      if (!eventName) return;
      try {
        const stop = eventOnApi(eventName, listener);
        stops.push(stop);
      } catch (_) {}
    };
    bind('mag_variable_update_ended', handler);
    bind(resolveTavernEventName('MESSAGE_UPDATED', 'message_updated'), flushHandler);
    bind(resolveTavernEventName('MESSAGE_RECEIVED', 'message_received'), flushHandler);
    bind(resolveTavernEventName('CHARACTER_MESSAGE_RENDERED', 'character_message_rendered'), flushHandler);
    return () => {
      stops.splice(0).forEach((stop) => {
        try {
          if (typeof stop === 'function') stop();
          else if (stop && typeof stop.stop === 'function') stop.stop();
        } catch (_) {}
      });
      clearTemporalReplayQueue();
    };
  }

  function sanitizeReplayOperationId(value) {
    return String(value || 'dokuha')
      .trim()
      .replace(/[^\w:.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'dokuha';
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function buildDokuhaReplayBlock(operationId, patches) {
    const id = sanitizeReplayOperationId(operationId);
    return [
      '<UpdateVariable>',
      `<Analysis>${REPLAY_PREFIX}:${id}</Analysis>`,
      '<JSONPatch>',
      JSON.stringify(patches, null, 2),
      '</JSONPatch>',
      '</UpdateVariable>'
    ].join('\n');
  }

  function stripDokuhaReplayBlock(content, operationId) {
    const id = sanitizeReplayOperationId(operationId);
    const text = typeof content === 'string' ? content : '';
    const pattern = new RegExp(
      `\\n*<UpdateVariable>\\s*(?:<(?:Analysis|Analyze)>\\s*${REPLAY_PREFIX}:${escapeRegExp(id)}\\s*<\\/(?:Analysis|Analyze)>\\s*)?<JSONPatch>[\\s\\S]*?<\\/JSONPatch>\\s*<\\/UpdateVariable>\\s*`,
      'gi'
    );
    return text.replace(pattern, '\n\n').replace(/\n{4,}/g, '\n\n\n').trimEnd();
  }

  function insertDokuhaReplayBlock(content, block) {
    const text = typeof content === 'string' ? content : '';
    const placeholder = '<StatusPlaceHolderImpl/>';
    const index = text.indexOf(placeholder);
    if (index >= 0) {
      const before = text.slice(0, index).trimEnd();
      const after = text.slice(index);
      return `${before}\n\n${block}\n\n${after.trimStart()}`;
    }
    const trimmed = text.trimEnd();
    return trimmed ? `${trimmed}\n\n${block}` : block;
  }

  function parseMessageIdFromFloorKey(floorKey) {
    const match = String(floorKey || '').trim().match(/^message:(\d+)$/i);
    if (!match) return null;
    const id = Number(match[1]);
    return Number.isFinite(id) && id >= 0 ? Math.round(id) : null;
  }

  function makeMessageFloorKey(messageId) {
    if (messageId === null || messageId === undefined || messageId === '') return '';
    const id = Number(messageId);
    return Number.isFinite(id) && id >= 0 ? `message:${Math.round(id)}` : '';
  }

  function getLatestMessageId() {
    try {
      if (typeof ROOT.getCurrentMessageId === 'function') {
        const id = Number(ROOT.getCurrentMessageId());
        if (Number.isFinite(id) && id >= 0) return Math.round(id);
      }
    } catch (_) {}
    try {
      if (typeof ROOT.getChatMessages === 'function') {
        const latest = ROOT.getChatMessages(-1)?.[0];
        const id = Number(latest?.message_id);
        if (Number.isFinite(id) && id >= 0) return Math.round(id);
      }
    } catch (_) {}
    try {
      if (typeof ROOT.getLastMessageId === 'function') {
        const id = Number(ROOT.getLastMessageId());
        if (Number.isFinite(id) && id >= 0) return Math.round(id);
      }
    } catch (_) {}
    return null;
  }

  function resolveReplayMessageId(options: any = {}) {
    const explicitId = Number(options.messageId ?? options.message_id);
    if (Number.isFinite(explicitId) && explicitId >= 0) return Math.round(explicitId);
    const floorId = parseMessageIdFromFloorKey(options.floorKey);
    if (floorId !== null) return floorId;
    return getLatestMessageId();
  }

  function hasMvuReplayBase(vars) {
    return isObject(vars) && isObject(vars.stat_data) && Object.prototype.hasOwnProperty.call(vars, 'schema');
  }

  async function getMessageVariableBundle(messageId) {
    if (typeof ROOT.getVariables !== 'function') return null;
    try {
      const id = Number(messageId);
      const options: any = { type: 'message' };
      if (Number.isFinite(id) && id >= 0) options.message_id = Math.round(id);
      const vars = await ROOT.getVariables(options);
      return isObject(vars) ? vars : null;
    } catch (error) {
      console.warn('[DOKUHA State Replay] failed to read message MVU variables:', error);
      return null;
    }
  }

  async function readStatData(options: any = {}) {
    const vars = typeof ROOT.STBridge?.mvu?.readVariables === 'function'
      ? await ROOT.STBridge.mvu.readVariables({ ...options, type: options.type || 'message' })
      : null;
    const statData = isObject(vars?.[STAT_KEY]) ? vars[STAT_KEY] : {};
    const state = isObject(statData?.[DOKUHA_KEY])
      ? statData[DOKUHA_KEY]
      : await ROOT.STBridge?.mvuz?.read?.('dokuha', { type: 'message' });
    return {
      ...statData,
      [DOKUHA_KEY]: normalizeDokuhaState(state),
      [SYSTEM_KEY]: normalizeDokuhaSystemState(statData?.[SYSTEM_KEY])
    };
  }

  async function loadState(options: any = {}) {
    const statData = await readStatData(options);
    return normalizeDokuhaState(statData[DOKUHA_KEY]);
  }

  async function loadContext(options: any = {}) {
    const statData = await readStatData(options);
    return {
      statData,
      dokuha: normalizeDokuhaState(statData[DOKUHA_KEY]),
      system: normalizeDokuhaSystemState(statData[SYSTEM_KEY])
    };
  }

  function resolveMvuReplayHandler() {
    const candidates: any[] = [];
    const seen: any[] = [];
    const pushHandler = (owner) => {
      try {
        const fn = owner && owner.handleVariablesInMessage;
        if (typeof fn !== 'function' || seen.includes(fn)) return;
        seen.push(fn);
        candidates.push(fn.bind(owner));
      } catch (_) {}
    };
    try {
      if (typeof handleVariablesInMessage === 'function' && !seen.includes(handleVariablesInMessage)) {
        seen.push(handleVariablesInMessage);
        candidates.push(handleVariablesInMessage);
      }
    } catch (_) {}
    try { pushHandler(ROOT); } catch (_) {}
    try { pushHandler(ROOT.parent); } catch (_) {}
    try { pushHandler(ROOT.top); } catch (_) {}
    try { pushHandler(ROOT.DOKUHA_ST_API); } catch (_) {}
    try { pushHandler(typeof unsafeWindow === 'object' ? unsafeWindow : null); } catch (_) {}
    try { pushHandler(typeof unsafeWindow === 'object' ? unsafeWindow?.parent : null); } catch (_) {}
    try { pushHandler(typeof unsafeWindow === 'object' ? unsafeWindow?.top : null); } catch (_) {}
    try { pushHandler(typeof unsafeWindow === 'object' ? unsafeWindow?.DOKUHA_ST_API : null); } catch (_) {}
    try { pushHandler(ROOT.STBridge?.mvu); } catch (_) {}
    return candidates[0] || null;
  }

  function resolveMvuApi() {
    const candidates: any[] = [];
    const pushOwner = (owner) => {
      try {
        if (owner && !candidates.includes(owner)) candidates.push(owner);
      } catch (_) {}
    };
    try { pushOwner(ROOT); } catch (_) {}
    try { pushOwner(ROOT.parent); } catch (_) {}
    try { pushOwner(ROOT.top); } catch (_) {}
    try { pushOwner(ROOT.DOKUHA_ST_API); } catch (_) {}
    try { pushOwner(typeof unsafeWindow === 'object' ? unsafeWindow : null); } catch (_) {}
    try { pushOwner(typeof unsafeWindow === 'object' ? unsafeWindow?.parent : null); } catch (_) {}
    try { pushOwner(typeof unsafeWindow === 'object' ? unsafeWindow?.top : null); } catch (_) {}
    try { pushOwner(typeof unsafeWindow === 'object' ? unsafeWindow?.DOKUHA_ST_API : null); } catch (_) {}
    for (const owner of candidates) {
      const api = owner?.Mvu;
      if (api && typeof api.parseMessage === 'function' && typeof api.replaceMvuData === 'function') return api;
    }
    return null;
  }

  async function getMvuReplayBaseVariables(messageId) {
    const id = Math.round(Number(messageId) || 0);
    const previousId = id > 0 ? id - 1 : 0;
    const previousVars = await getMessageVariableBundle(previousId);
    if (hasMvuReplayBase(previousVars)) return clone(previousVars, previousVars);
    if (id === 0) {
      const currentVars = await getMessageVariableBundle(0);
      if (hasMvuReplayBase(currentVars)) return clone(currentVars, currentVars);
    }
    return null;
  }

  async function replayMessageThroughMvu(messageId, options: any = {}) {
    const replayHandler = resolveMvuReplayHandler();
    const suppressTemporalSync = options.suppressTemporalSync === true;
    if (suppressTemporalSync) temporalSyncDepth += 1;
    try {
      if (typeof replayHandler === 'function') {
        await replayHandler(messageId);
        return { ok: true, method: 'handleVariablesInMessage' };
      }

      const mvuApi = resolveMvuApi();
      if (!mvuApi) return { ok: false, reason: 'mvu_replay_unavailable' };

      const id = Math.round(Number(messageId) || 0);
      const msg = typeof ROOT.getChatMessages === 'function' ? ROOT.getChatMessages(id)?.[0] : null;
      if (!msg || typeof msg.message !== 'string') return { ok: false, reason: 'message_not_found' };

      const baseVars = await getMvuReplayBaseVariables(id);
      if (!hasMvuReplayBase(baseVars)) return { ok: false, reason: 'mvu_replay_missing_base' };

      const nextVars = await mvuApi.parseMessage(msg.message, baseVars);
      if (!hasMvuReplayBase(nextVars)) return { ok: false, reason: 'mvu_replay_parse_failed' };
      await mvuApi.replaceMvuData(nextVars, { type: 'message', message_id: id });
      return { ok: true, method: 'Mvu.parseMessage' };
    } finally {
      if (suppressTemporalSync) temporalSyncDepth = Math.max(0, temporalSyncDepth - 1);
    }
  }

  async function parseMvuVariablesFromMessage(messageId, messageText) {
    const mvuApi = resolveMvuApi();
    if (!mvuApi) return null;
    const baseVars = await getMvuReplayBaseVariables(messageId);
    if (!hasMvuReplayBase(baseVars)) return null;
    try {
      const parsed = await mvuApi.parseMessage(String(messageText || ''), baseVars);
      return hasMvuReplayBase(parsed) ? parsed : null;
    } catch (error) {
      console.warn('[DOKUHA State Replay] failed to parse stripped replay baseline:', error);
      return null;
    }
  }

  function normalizeReplayPatches(patches) {
    const byPath = new Map();
    (Array.isArray(patches) ? patches : []).forEach((patch) => {
      if (!patch || typeof patch !== 'object') return;
      const path = typeof patch.path === 'string' ? patch.path.trim() : '';
      const allowed = path === '/dokuha' || ALLOWED_FIELD_PATHS.includes(path);
      if (!allowed) return;
      byPath.set(path, { ...patch, path });
    });
    return Array.from(byPath.values());
  }

  async function commitDokuhaReplayPatch(options: any = {}) {
    const messageId = resolveReplayMessageId(options);
    if (!Number.isFinite(Number(messageId)) || Number(messageId) < 0) {
      return { ok: false, reason: 'missing_message_id' };
    }

    const normalizedMessageId = Math.round(Number(messageId));
    const expectedFloorKey = typeof options.floorKey === 'string' ? options.floorKey.trim() : '';
    const actualFloorKey = makeMessageFloorKey(normalizedMessageId);
    if (expectedFloorKey && expectedFloorKey !== actualFloorKey) {
      return { ok: false, reason: 'floor_key_mismatch', floorKey: actualFloorKey, expectedFloorKey };
    }

    if (typeof ROOT.getChatMessages !== 'function' || typeof ROOT.setChatMessages !== 'function') {
      if (isObject(options.afterStatData?.[DOKUHA_KEY])) {
        const state = normalizeDokuhaState(options.afterStatData[DOKUHA_KEY]);
        await ROOT.STBridge?.mvuz?.write?.('dokuha', state, { type: 'message' });
        return { ok: true, method: 'direct-mvuz-write', patchCount: 0, state };
      }
      return { ok: false, reason: 'chat_message_api_unavailable', messageId: normalizedMessageId, floorKey: actualFloorKey };
    }

    const vars = await getMessageVariableBundle(normalizedMessageId);
    if (!hasMvuReplayBase(vars)) {
      return { ok: false, reason: 'mvu_replay_missing_base', messageId: normalizedMessageId, floorKey: actualFloorKey };
    }

    const messages = ROOT.getChatMessages(normalizedMessageId);
    const msg = Array.isArray(messages) ? messages[0] : null;
    if (!msg || typeof msg !== 'object') {
      return { ok: false, reason: 'message_not_found', messageId: normalizedMessageId, floorKey: actualFloorKey };
    }

    const hasReplayHandler = typeof resolveMvuReplayHandler() === 'function';
    const hasMvuApi = Boolean(resolveMvuApi());
    if (!hasReplayHandler && !hasMvuApi) {
      return { ok: false, reason: 'mvu_replay_unavailable', messageId: normalizedMessageId, floorKey: actualFloorKey };
    }

    const operationId = sanitizeReplayOperationId(options.operationId || 'state:dokuha');
    const stripIds = [
      operationId,
      ...(Array.isArray(options.replaceOperationIds) ? options.replaceOperationIds : [])
    ].map(sanitizeReplayOperationId).filter(Boolean);
    const originalMessage = msg.message || '';
    const stripped = Array.from(new Set(stripIds)).reduce((content, stripId) => stripDokuhaReplayBlock(content, stripId), originalMessage);

    let patchList = Array.isArray(options.patches) ? normalizeReplayPatches(options.patches) : [];
    if (isObject(options.afterStatData)) {
      const parsedBaseline = await parseMvuVariablesFromMessage(normalizedMessageId, stripped);
      const baselineStatData = hasMvuReplayBase(parsedBaseline)
        ? parsedBaseline.stat_data
        : (isObject(options.beforeStatData) ? options.beforeStatData : vars.stat_data);
      patchList = buildDokuhaStatePatches(baselineStatData, options.afterStatData);
      if (!hasMvuReplayBase(parsedBaseline) && stripped !== originalMessage) {
        patchList = buildDokuhaValuePatches(options.afterStatData);
      }
      patchList = normalizeReplayPatches(patchList);
    }

    if (!patchList.length) {
      if (stripped !== originalMessage) {
        await ROOT.setChatMessages([{ message_id: normalizedMessageId, message: stripped }], { refresh: options.refresh || 'affected' });
        const replayResult = await replayMessageThroughMvu(normalizedMessageId, {
          suppressTemporalSync: options.suppressTemporalSync === true || isObject(options.afterStatData)
        });
        if (!replayResult.ok) return { ok: false, reason: replayResult.reason || 'mvu_replay_failed', messageId: normalizedMessageId, floorKey: actualFloorKey, operationId };
        return { ok: true, messageId: normalizedMessageId, floorKey: actualFloorKey, operationId, patchCount: 0, removedReplayBlock: true, replayMethod: replayResult.method || '' };
      }
      return { ok: true, messageId: normalizedMessageId, floorKey: actualFloorKey, operationId, patchCount: 0, unchanged: true };
    }

    const block = buildDokuhaReplayBlock(operationId, patchList);
    const nextMessage = insertDokuhaReplayBlock(stripped, block);
    await ROOT.setChatMessages([{ message_id: normalizedMessageId, message: nextMessage }], { refresh: options.refresh || 'affected' });

    const replayResult = await replayMessageThroughMvu(normalizedMessageId, {
      suppressTemporalSync: options.suppressTemporalSync === true || isObject(options.afterStatData)
    });
    if (!replayResult.ok) {
      return { ok: false, reason: replayResult.reason || 'mvu_replay_failed', messageId: normalizedMessageId, floorKey: actualFloorKey, operationId };
    }
    return { ok: true, messageId: normalizedMessageId, floorKey: actualFloorKey, operationId, patchCount: patchList.length, replayMethod: replayResult.method || '' };
  }

  async function saveState(nextState, options: any = {}) {
    const messageId = resolveReplayMessageId(options);
    if (!Number.isFinite(Number(messageId)) || Number(messageId) < 0) {
      if (typeof ROOT.getChatMessages !== 'function') {
        const state = normalizeDokuhaState(nextState);
        await ROOT.STBridge?.mvuz?.write?.('dokuha', state, { type: 'message' });
        notifyStateChanged(state);
        return state;
      }
      throw new Error('missing_message_id');
    }
    const vars = await getMessageVariableBundle(messageId);
    const beforeStatData = isObject(vars?.[STAT_KEY]) ? vars[STAT_KEY] : {};
    const normalized = normalizeDokuhaState(nextState);
    const afterStatData = { ...beforeStatData, [DOKUHA_KEY]: normalized };
    const result = await commitDokuhaReplayPatch({
      messageId,
      floorKey: options.floorKey,
      operationId: options.operationId || 'state:dokuha',
      replaceOperationIds: options.replaceOperationIds,
      beforeStatData,
      afterStatData,
      refresh: options.refresh
    });
    if (!result.ok) {
      const error: any = new Error(result.reason || 'mvu_replay_failed');
      error.result = result;
      throw error;
    }
    notifyStateChanged(normalized);
    return normalized;
  }

  async function patchState(patcher, options: any = {}) {
    const current = await loadState(options);
    const draft = clone(current, {});
    const result = typeof patcher === 'function' ? await patcher(draft, current) : patcher;
    return saveState(isObject(result) ? result : draft, options);
  }

  function notifyStateChanged(state) {
    try {
      ROOT.dispatchEvent?.(new CustomEvent('dokuha:stateChanged', { detail: { product: 'project-dokuha', state } }));
    } catch (_) {}
  }

  RUNTIME.createStateReplay = function createStateReplay() {
    return {
      STAT_KEY,
      DOKUHA_KEY,
      ALLOWED_FIELD_PATHS: clone(ALLOWED_FIELD_PATHS, []),
      readStatData,
      loadState,
      loadContext,
      saveState,
      patchState,
      notifyStateChanged,
      makeMessageFloorKey,
      commitDokuhaReplayPatch,
      resolveReplayMessageId,
      computeTemporalTransition,
      startTemporalSync
    };
  };
})();
