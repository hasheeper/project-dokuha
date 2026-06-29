import { EXPRESSION_FALLBACK_CONFIG } from './expression-fallback-config.js';

export interface ExpressionLayerRef {
  id: number;
  name: string;
  face: string;
  mouth: string;
  eye: string;
  brow: string;
  synthetic?: true;
  sourceName?: string;
  matchedTokens?: string[];
  unmatchedTokens?: string[];
  other?: string | string[];
}

export interface ExpressionFallbackAssets {
  face: readonly string[];
  mouth: readonly string[];
  eye: readonly string[];
  brow: readonly string[];
  other: readonly string[];
}

type SingularSlot = 'face' | 'mouth' | 'eye' | 'brow';
type ListSlot = 'other';
type ExpressionSlot = SingularSlot | ListSlot;

interface KeywordEffect {
  slot: ExpressionSlot;
  value: string;
  priority: number;
}

interface KeywordRule {
  alias: string;
  effects: KeywordEffect[];
}

interface RuleMatch {
  alias: string;
  effects: KeywordEffect[];
  length: number;
  fuzzy: boolean;
}

interface SlotState {
  value: string;
  priority: number;
  order: number;
}

const FALLBACK_DEFAULTS = EXPRESSION_FALLBACK_CONFIG.defaults;
const FALLBACK_PRIORITIES = EXPRESSION_FALLBACK_CONFIG.priorities;
const FALLBACK_THRESHOLDS = EXPRESSION_FALLBACK_CONFIG.thresholds;
const FALLBACK_STOP_TOKENS = new Set<string>(EXPRESSION_FALLBACK_CONFIG.stopTokens);
const KEYWORD_RULES: KeywordRule[] = EXPRESSION_FALLBACK_CONFIG.keywordRules.map((rule) => ({
  alias: rule.alias,
  effects: rule.effects.map((effect) => ({
    slot: effect.slot,
    value: effect.value,
    priority: effect.priority
  }))
}));

export function resolveExpressionWithFallback(
  value: unknown,
  expressions: readonly ExpressionLayerRef[],
  defaultExpression: string,
  assets: ExpressionFallbackAssets
): ExpressionLayerRef {
  const requested = readExpressionName(value);
  if (!requested) return resolveDefaultExpression(expressions, defaultExpression);

  const exact = findExactExpression(requested, expressions);
  if (exact) return exact;

  const canonical = canonicalizeExpressionName(requested);
  const normalized = findNormalizedExpression(canonical, expressions);
  if (normalized) return normalized;

  const typo = findTypoExpression(canonical, expressions);
  if (typo) return typo;

  const synthetic = buildSyntheticExpression(requested, canonical, assets);
  return synthetic || resolveDefaultExpression(expressions, defaultExpression);
}

export function readExpressionName(value: unknown): string {
  if (isExpressionObject(value)) return normalizeExpressionText(value.name);
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return normalizeExpressionText(String(value));
}

export function canonicalizeExpressionName(value: string): string {
  return normalizeExpressionText(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(exp_)+/, '');
}

function normalizeExpressionText(value: string): string {
  let text = value.trim();
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed === 'string' || typeof parsed === 'number') text = String(parsed).trim();
  } catch (_) {}
  return extractExpressionTag(text)
    .replace(/<\/?dokuha-exp>/gi, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
}

function extractExpressionTag(value: string): string {
  const text = String(value || '');
  const dokuhaMatch = text.match(/<dokuha-exp>\s*([\s\S]*?)\s*<\/dokuha-exp>/i);
  if (dokuhaMatch) return dokuhaMatch[1] || '';
  return text;
}

function isExpressionObject(value: unknown): value is { name: string } {
  return Boolean(value && typeof value === 'object' && typeof (value as { name?: unknown }).name === 'string');
}

function findExactExpression(requested: string, expressions: readonly ExpressionLayerRef[]): ExpressionLayerRef | null {
  const byId = Number(requested);
  if (Number.isFinite(byId)) {
    return expressions.find((expression) => expression.id === Math.round(byId)) || null;
  }
  return expressions.find((expression) => expression.name === requested) || null;
}

function findNormalizedExpression(canonical: string, expressions: readonly ExpressionLayerRef[]): ExpressionLayerRef | null {
  if (!canonical) return null;
  return expressions.find((expression) => canonicalizeExpressionName(expression.name) === canonical) || null;
}

function findTypoExpression(canonical: string, expressions: readonly ExpressionLayerRef[]): ExpressionLayerRef | null {
  if (canonical.length < 5) return null;
  const ranked = expressions
    .map((expression) => ({
      expression,
      distance: damerauLevenshteinDistance(canonical, canonicalizeExpressionName(expression.name))
    }))
    .sort((a, b) => a.distance - b.distance);
  const best = ranked[0];
  const second = ranked[1];
  if (!best) return null;

  const target = canonicalizeExpressionName(best.expression.name);
  const confidence = normalizedEditConfidence(canonical, target, best.distance);
  const allowedDistance = best.distance <= 1 || (canonical.length >= 8 && best.distance <= 2);
  const allowedConfidence = confidence >= FALLBACK_THRESHOLDS.presetMinConfidence;
  const unique = !second || second.distance > best.distance;
  return allowedDistance && allowedConfidence && unique ? best.expression : null;
}

function buildSyntheticExpression(
  sourceName: string,
  canonical: string,
  assets: ExpressionFallbackAssets
): ExpressionLayerRef | null {
  const rawTokens = canonical.split('_').filter(Boolean);
  const tokens = rawTokens.filter((token) => !FALLBACK_STOP_TOKENS.has(token));
  if (!tokens.length) return null;

  const rules = buildKeywordRuleMap(assets);
  const slots: Record<SingularSlot, SlotState> = {
    face: { value: FALLBACK_DEFAULTS.face, priority: 0, order: -1 },
    mouth: { value: FALLBACK_DEFAULTS.mouth, priority: 0, order: -1 },
    eye: { value: FALLBACK_DEFAULTS.eye, priority: 0, order: -1 },
    brow: { value: FALLBACK_DEFAULTS.brow, priority: 0, order: -1 }
  };
  const listSlots: Record<ListSlot, string[]> = { other: [] };
  const matchedTokens: string[] = [];
  const matchedIndexes = new Set<number>();
  let meaningfulMatches = 0;
  let order = 0;

  for (let index = 0; index < tokens.length;) {
    const match = findRuleMatch(tokens, index, rules);
    if (!match) {
      index += 1;
      continue;
    }

    matchedTokens.push(match.alias);
    for (let offset = 0; offset < match.length; offset += 1) matchedIndexes.add(index + offset);
    match.effects.forEach((effect) => applyKeywordEffect(effect, slots, listSlots, order));
    if (hasVisualEffect(match.effects)) meaningfulMatches += match.length;
    order += 1;
    index += match.length;
  }

  if (!matchedTokens.length) return null;
  if (!meaningfulMatches) return null;
  if (meaningfulMatches / tokens.length < FALLBACK_THRESHOLDS.syntheticMinTokenMatchRatio) return null;

  const expression: ExpressionLayerRef = {
    id: 0,
    name: `exp_${canonical}`,
    face: slots.face.value,
    mouth: slots.mouth.value,
    eye: slots.eye.value,
    brow: slots.brow.value,
    synthetic: true,
    sourceName,
    matchedTokens: unique(matchedTokens),
    unmatchedTokens: unique(tokens.filter((_, index) => !matchedIndexes.has(index)))
  };
  if (listSlots.other.length) expression.other = listSlots.other;
  return expression;
}

function applyKeywordEffect(
  effect: KeywordEffect,
  slots: Record<SingularSlot, SlotState>,
  listSlots: Record<ListSlot, string[]>,
  order: number
): void {
  if (effect.slot === 'other') {
    if (!listSlots.other.includes(effect.value)) listSlots.other.push(effect.value);
    return;
  }

  const current = slots[effect.slot];
  if (effect.priority > current.priority || (effect.priority === current.priority && order >= current.order)) {
    slots[effect.slot] = { value: effect.value, priority: effect.priority, order };
  }
}

function buildKeywordRuleMap(assets: ExpressionFallbackAssets): Map<string, KeywordEffect[]> {
  const rules = new Map<string, KeywordEffect[]>();
  addExplicitAssetRules(rules, 'face', 'face_', assets.face);
  addExplicitAssetRules(rules, 'mouth', 'mouth_', assets.mouth);
  addExplicitAssetRules(rules, 'eye', 'eye_', assets.eye);
  addExplicitAssetRules(rules, 'brow', 'brow_', assets.brow);
  addExplicitAssetRules(rules, 'other', '', assets.other);

  KEYWORD_RULES.forEach((rule) => addRuleIfAvailable(rules, assets, rule.alias, rule.effects));

  return rules;
}

function addExplicitAssetRules(
  rules: Map<string, KeywordEffect[]>,
  slot: ExpressionSlot,
  prefix: string,
  names: readonly string[]
): void {
  names.forEach((name) => {
    const canonical = canonicalizeAssetName(name);
    const stripped = prefix ? canonicalizeAssetName(name.replace(new RegExp(`^${prefix}`, 'i'), '')) : canonical;
    const effect = { slot, value: name, priority: FALLBACK_PRIORITIES.explicitComponent };
    addRule(rules, canonical, [effect]);
    addRule(rules, stripped, [effect]);
  });
}

function addRuleIfAvailable(
  rules: Map<string, KeywordEffect[]>,
  assets: ExpressionFallbackAssets,
  alias: string,
  effects: KeywordEffect[]
): void {
  const available = effects.filter((effect) => assets[effect.slot].includes(effect.value));
  if (available.length) addRule(rules, alias, available);
}

function addRule(rules: Map<string, KeywordEffect[]>, alias: string, effects: KeywordEffect[]): void {
  const canonical = canonicalizeAssetName(alias);
  if (!canonical) return;
  unique([canonical, canonical.replace(/_/g, '')]).forEach((item) => {
    const current = rules.get(item) || [];
    rules.set(item, [...current, ...effects]);
  });
}

function findRuleMatch(
  tokens: string[],
  index: number,
  rules: Map<string, KeywordEffect[]>
): RuleMatch | null {
  const maxLength = Math.min(4, tokens.length - index);
  for (let length = maxLength; length >= 1; length -= 1) {
    const alias = tokens.slice(index, index + length).join('_');
    const effects = rules.get(alias);
    if (effects) return { alias, effects, length, fuzzy: false };
  }

  const fuzzyAlias = findFuzzyRuleAlias(tokens[index], rules);
  const fuzzyEffects = fuzzyAlias ? rules.get(fuzzyAlias) : null;
  return fuzzyAlias && fuzzyEffects ? { alias: fuzzyAlias, effects: fuzzyEffects, length: 1, fuzzy: true } : null;
}

function findFuzzyRuleAlias(token: string, rules: Map<string, KeywordEffect[]>): string | null {
  if (token.length < 4) return null;
  const ranked = Array.from(rules.keys())
    .filter((alias) => !alias.includes('_') && alias.length >= 4)
    .map((alias) => ({ alias, distance: damerauLevenshteinDistance(token, alias) }))
    .sort((a, b) => a.distance - b.distance);
  const best = ranked[0];
  const second = ranked[1];
  if (!best) return null;

  const allowed = best.distance <= FALLBACK_THRESHOLDS.shortTokenMaxDistance ||
    (token.length >= FALLBACK_THRESHOLDS.longTokenMinLength && best.distance <= FALLBACK_THRESHOLDS.longTokenMaxDistance);
  const unique = !second || second.distance > best.distance;
  return allowed && unique ? best.alias : null;
}

function canonicalizeAssetName(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function resolveDefaultExpression(expressions: readonly ExpressionLayerRef[], defaultExpression: string): ExpressionLayerRef {
  return expressions.find((expression) => expression.name === defaultExpression) || expressions[0];
}

function normalizedEditConfidence(a: string, b: string, distance: number): number {
  const maxLength = Math.max(a.length, b.length);
  return maxLength ? 1 - distance / maxLength : 1;
}

function hasVisualEffect(effects: KeywordEffect[]): boolean {
  return effects.some((effect) => (
    effect.slot === 'face' ||
    effect.slot === 'mouth' ||
    effect.slot === 'eye' ||
    effect.slot === 'brow' ||
    effect.slot === 'other'
  ));
}

function damerauLevenshteinDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);
  const transposed = Array.from({ length: b.length + 1 }, () => 0);

  for (let row = 1; row <= a.length; row += 1) {
    current[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      let distance = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + cost
      );
      if (
        row > 1 &&
        column > 1 &&
        a[row - 1] === b[column - 2] &&
        a[row - 2] === b[column - 1]
      ) {
        distance = Math.min(distance, transposed[column - 2] + 1);
      }
      current[column] = distance;
    }
    for (let column = 0; column <= b.length; column += 1) {
      transposed[column] = previous[column];
      previous[column] = current[column];
    }
  }

  return previous[b.length];
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values.filter(Boolean)));
}
