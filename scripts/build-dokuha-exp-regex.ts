import fs from 'node:fs';
import path from 'node:path';

interface ExpressionRef {
  id: number;
  name: string;
  face: string;
  mouth: string;
  eye: string;
  brow: string;
  other?: string | string[];
}

interface ExpressionData {
  count: number;
  expressions: ExpressionRef[];
}

interface AssetRefs {
  base: string[];
  face: string[];
  eye: string[];
  mouth: string[];
  brow: string[];
  other: string[];
}

interface OutputConfig {
  file: string;
  title: string;
  assetBaseUrl: string;
}

const rootDir = process.cwd();
const expressionDir = path.join(rootDir, 'src/assets/png/standing/expression');
const baseDir = path.join(rootDir, 'src/assets/png/standing/base');
const otherDir = path.join(expressionDir, 'other');
const expDataPath = path.join(expressionDir, 'exp.json');
const assetCachePath = path.join(rootDir, 'apps/st-bridge/packs/dokuha-main/asset-cache.js');

const outputConfigs: OutputConfig[] = [
  {
    file: path.join(rootDir, 'ST/regex/DOKUHA_EXP.html'),
    title: 'DOKUHA Expression Portrait',
    assetBaseUrl: 'https://hasheeper.github.io/project-dokuha/dokuha-assets/standing'
  },
  {
    file: path.join(rootDir, 'ST/regex/local/DOKUHA_EXP.local.html'),
    title: 'DOKUHA Expression Portrait Local',
    assetBaseUrl: 'http://127.0.0.1:4173/dokuha-assets/standing'
  }
];

const dossierOutputConfigs: OutputConfig[] = [
  {
    file: path.join(rootDir, 'ST/regex/DOKUHA_DOSSIER.html'),
    title: 'DOKUHA Trial Dossier',
    assetBaseUrl: 'https://hasheeper.github.io/project-dokuha/dokuha-assets/standing'
  },
  {
    file: path.join(rootDir, 'ST/regex/local/DOKUHA_DOSSIER.local.html'),
    title: 'DOKUHA Trial Dossier Local',
    assetBaseUrl: 'http://127.0.0.1:4173/dokuha-assets/standing'
  }
];

const expData = JSON.parse(fs.readFileSync(expDataPath, 'utf8')) as ExpressionData;
const assetRefs = collectAssetRefs(expData);
const defaultExpression = expData.expressions.find((item) => item.name === 'exp_default') || expData.expressions[0];
const fallbackConfig = {
  defaults: {
    face: defaultExpression?.face || 'face_default',
    mouth: defaultExpression?.mouth || 'mouth_neutral',
    eye: defaultExpression?.eye || 'eye_normal',
    brow: defaultExpression?.brow || 'brow_down'
  },
  priorities: {
    explicitComponent: 90,
    visualKeyword: 50,
    secondaryKeyword: 40
  },
  thresholds: {
    presetMinConfidence: 0.88,
    syntheticMinTokenMatchRatio: 0.5,
    shortTokenMaxDistance: 1,
    longTokenMaxDistance: 2,
    longTokenMinLength: 6
  },
  stopTokens: ['exp', 'expression', 'dokuha', 'dokuhasaka', 'kosaka'],
  keywordRules: [
    { alias: 'jitome', effects: [{ slot: 'eye', value: 'eye_jitome_1', priority: 50 }] },
    { alias: 'deadpan', effects: [{ slot: 'eye', value: 'eye_jitome_1', priority: 50 }] },
    { alias: 'glare', effects: [{ slot: 'eye', value: 'eye_jitome_2', priority: 50 }] },
    {
      alias: 'pout',
      effects: [
        { slot: 'mouth', value: 'mouth_pout', priority: 50 },
        { slot: 'brow', value: 'brow_up', priority: 40 }
      ]
    },
    { alias: 'smile', effects: [{ slot: 'mouth', value: 'mouth_smile', priority: 50 }] },
    { alias: 'smirk', effects: [{ slot: 'mouth', value: 'mouth_smirk', priority: 50 }] },
    { alias: 'huh', effects: [{ slot: 'mouth', value: 'mouth_huh_1', priority: 50 }] },
    { alias: 'awawa', effects: [{ slot: 'mouth', value: 'mouth_awawa', priority: 50 }] },
    { alias: 'drool', effects: [{ slot: 'mouth', value: 'mouth_drool', priority: 50 }] },
    { alias: 'open', effects: [{ slot: 'mouth', value: 'mouth_open', priority: 50 }] },
    { alias: 'gritting', effects: [{ slot: 'mouth', value: 'mouth_gritting_teeth', priority: 50 }] },
    { alias: 'teeth', effects: [{ slot: 'mouth', value: 'mouth_gritting_teeth', priority: 50 }] },
    { alias: 'blank', effects: [{ slot: 'mouth', value: 'mouth_blank_1', priority: 50 }] },
    { alias: 'tongue', effects: [{ slot: 'mouth', value: 'mouth_tongue', priority: 50 }] },
    { alias: 'neutral', effects: [{ slot: 'mouth', value: 'mouth_neutral', priority: 40 }] },
    { alias: 'down', effects: [{ slot: 'brow', value: 'brow_down', priority: 50 }] },
    { alias: 'up', effects: [{ slot: 'brow', value: 'brow_up', priority: 50 }] },
    { alias: 'normal', effects: [{ slot: 'brow', value: 'brow_normal', priority: 40 }] },
    { alias: 'closed', effects: [{ slot: 'eye', value: 'eye_closed', priority: 50 }] },
    { alias: 'line', effects: [{ slot: 'eye', value: 'eye_line', priority: 50 }] },
    { alias: 'star', effects: [{ slot: 'eye', value: 'eye_star', priority: 50 }] },
    { alias: 'circle', effects: [{ slot: 'eye', value: 'eye_circle', priority: 50 }] },
    { alias: 'xd', effects: [{ slot: 'eye', value: 'eye_xd', priority: 50 }] },
    { alias: 'wide', effects: [{ slot: 'eye', value: 'eye_wide_1', priority: 50 }] },
    { alias: 'cry', effects: [{ slot: 'eye', value: 'eye_cry', priority: 50 }] },
    { alias: 'dizzy', effects: [{ slot: 'eye', value: 'eye_dizzy', priority: 50 }] },
    { alias: 'half', effects: [{ slot: 'eye', value: 'eye_half_1', priority: 40 }] },
    { alias: 'socket', effects: [{ slot: 'eye', value: 'eye_socket', priority: 50 }] },
    { alias: 'default', effects: [{ slot: 'face', value: 'face_default', priority: 40 }] },
    { alias: 'shadow', effects: [{ slot: 'face', value: 'face_shadow', priority: 50 }] },
    { alias: 'pale', effects: [{ slot: 'face', value: 'face_pale', priority: 50 }] },
    { alias: 'blush', effects: [{ slot: 'face', value: 'face_blush', priority: 50 }] },
    { alias: 'sweat', effects: [{ slot: 'other', value: 'sweat', priority: 50 }] },
    { alias: 'tear', effects: [{ slot: 'other', value: 'eye_tears_1', priority: 50 }] },
    { alias: 'tears', effects: [{ slot: 'other', value: 'eye_tears_1', priority: 50 }] },
    {
      alias: 'sad',
      effects: [
        { slot: 'mouth', value: 'mouth_down_2', priority: 50 },
        { slot: 'brow', value: 'brow_down', priority: 50 }
      ]
    },
    {
      alias: 'surprised',
      effects: [
        { slot: 'eye', value: 'eye_wide_1', priority: 50 },
        { slot: 'mouth', value: 'mouth_huh_1', priority: 50 }
      ]
    },
    {
      alias: 'panic',
      effects: [
        { slot: 'mouth', value: 'mouth_awawa', priority: 50 },
        { slot: 'eye', value: 'eye_wide_1', priority: 50 },
        { slot: 'brow', value: 'brow_down', priority: 50 }
      ]
    }
  ]
};

function listPngKeys(dir: string): string[] {
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.png') && !name.replace(/\.png$/i, '').endsWith('_old'))
    .map((name) => name.replace(/\.png$/i, ''))
    .sort();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function collectAssetRefs(data: ExpressionData): AssetRefs {
  return {
    base: listPngKeys(baseDir),
    face: unique(['face_default', 'face_pale', 'face_shadow', ...data.expressions.map((item) => item.face)]),
    eye: unique(data.expressions.map((item) => item.eye)),
    mouth: unique(data.expressions.map((item) => item.mouth)),
    brow: unique(data.expressions.map((item) => item.brow)),
    other: listPngKeys(otherDir)
  };
}

function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

function renderHtml({ title, assetBaseUrl }: OutputConfig): string {
  return `\`\`\`html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    * {
      box-sizing: border-box;
      user-select: none;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent;
    }

    body {
      display: grid;
      place-items: center;
    }

    #dokuha-exp-app {
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      display: grid;
      place-items: center;
      overflow: hidden;
      background: transparent;
      container-type: size;
    }

    .portrait-frame {
      width: min(100%, 100vh);
      aspect-ratio: 1 / 1;
      max-width: 100%;
      max-height: 100%;
      min-width: 0;
      min-height: 0;
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      background:
        linear-gradient(180deg, rgba(255, 250, 253, 0.94), rgba(242, 236, 244, 0.92)),
        #f8f1f6;
      box-shadow:
        inset 0 0 0 1px rgba(58, 36, 50, 0.1),
        0 8px 24px rgba(45, 35, 50, 0.12);
    }

    @supports (width: 100cqw) {
      .portrait-frame {
        width: min(100cqw, 100cqh);
        height: min(100cqw, 100cqh);
      }
    }

    .portrait-crop {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    .dokuha-standing {
      position: absolute;
      left: 50%;
      top: 112%;
      width: 285%;
      height: 285%;
      transform: translate(-50%, -50%);
      overflow: visible;
      isolation: isolate;
      -webkit-transform: translate(-50%, -50%);
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }

    .dokuha-standing__canvas {
      position: absolute;
      inset: 0;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center bottom;
      pointer-events: none;
      user-select: none;
      -webkit-user-drag: none;
      transform: translate3d(0, 0, 0);
      -webkit-transform: translate3d(0, 0, 0);
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
  </style>
</head>
<body>
  <script id="dokuha-exp" type="application/json">$4</script>
  <main id="dokuha-exp-app" data-app-id="expression-portrait"></main>

  <script>
    (function () {
      const EXP_DATA = ${scriptJson(expData)};
      const ASSET_REFS = ${scriptJson(assetRefs)};
      const STATIC_ASSET_BASE_URL = '${assetBaseUrl}';
      const ASSET_BASE_URL = resolveAssetBaseUrl();
      const DEFAULT_EXPRESSION = 'exp_default';
      const DEFAULT_OUTFIT = 'streetwear_full';
      const MASK_ACCESSORY_NAMES = ['no_mask', 'mask_up', 'mask_down'];
      const STACKABLE_ACCESSORY_NAMES = ['headphones'];
      const ACCESSORY_NAMES = MASK_ACCESSORY_NAMES.concat(STACKABLE_ACCESSORY_NAMES);
      const CACHE_KEY = '__DOKUHA_EXP_IMAGE_CACHE__';
      const FALLBACK_CONFIG = ${scriptJson(fallbackConfig)};
      const FALLBACK_DEFAULTS = FALLBACK_CONFIG.defaults;
      const FALLBACK_PRIORITIES = FALLBACK_CONFIG.priorities;
      const FALLBACK_THRESHOLDS = FALLBACK_CONFIG.thresholds;
      const FALLBACK_STOP_TOKENS = new Set(FALLBACK_CONFIG.stopTokens);
      const KEYWORD_RULES = FALLBACK_CONFIG.keywordRules;
      const app = document.getElementById('dokuha-exp-app');
      const hostFrame = window.frameElement;
      let currentExpression = resolveExpression(readExpression()).name;
      let currentOutfit = resolveOutfit(readInitialOutfit());
      let currentAccessories = normalizeAccessories(readInitialAccessories());
      let warmAllScheduled = false;

      function readExpression() {
        const dataNode = document.getElementById('dokuha-exp');
        const raw = (dataNode && (dataNode.textContent || dataNode.innerText) || '').trim();
        if (!raw) return DEFAULT_EXPRESSION;
        try {
          const parsed = JSON.parse(raw);
          if (typeof parsed === 'string' || typeof parsed === 'number') return String(parsed).trim() || DEFAULT_EXPRESSION;
        } catch (_) {}
        return extractExpressionTag(raw)
          .replace(/^<dokuha-exp>|<\\/dokuha-exp>$/gi, '')
          .replace(/^[\\"']|[\\"']$/g, '')
          .trim() || DEFAULT_EXPRESSION;
      }

      function resolveExpression(value) {
        const requested = readExpressionName(value);
        if (!requested) return defaultExpression();

        const exact = findExactExpression(requested);
        if (exact) return exact;

        const canonical = canonicalizeExpressionName(requested);
        const normalized = EXP_DATA.expressions.find(function (item) {
          return canonicalizeExpressionName(item.name) === canonical;
        });
        if (normalized) return normalized;

        const typo = findTypoExpression(canonical);
        if (typo) return typo;

        const synthetic = buildSyntheticExpression(requested, canonical);
        return synthetic || defaultExpression();
      }

      function readExpressionName(value) {
        if (value && typeof value === 'object' && typeof value.name === 'string') return normalizeExpressionText(value.name);
        if (typeof value !== 'string' && typeof value !== 'number') return '';
        return normalizeExpressionText(String(value));
      }

      function normalizeExpressionText(value) {
        let text = value.trim();
        try {
          const parsed = JSON.parse(text);
          if (typeof parsed === 'string' || typeof parsed === 'number') text = String(parsed).trim();
        } catch (_) {}
        return extractExpressionTag(text)
          .replace(/<\\/?dokuha-exp>/gi, '')
          .replace(/^[\\"'\`]+|[\\"'\`]+$/g, '')
          .trim();
      }

      function extractExpressionTag(value) {
        const text = String(value || '');
        const dokuhaMatch = text.match(/<dokuha-exp>\\s*([\\s\\S]*?)\\s*<\\/dokuha-exp>/i);
        if (dokuhaMatch) return dokuhaMatch[1] || '';
        return text;
      }

      function canonicalizeExpressionName(value) {
        return normalizeExpressionText(value)
          .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .replace(/^(exp_)+/, '');
      }

      function canonicalizeAssetName(value) {
        return value
          .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
      }

      function findExactExpression(requested) {
        const byId = Number(requested);
        if (Number.isFinite(byId)) {
          return EXP_DATA.expressions.find(function (item) {
            return item.id === Math.round(byId);
          }) || null;
        }
        return EXP_DATA.expressions.find(function (item) {
          return item.name === requested;
        }) || null;
      }

      function findTypoExpression(canonical) {
        if (canonical.length < 5) return null;
        const ranked = EXP_DATA.expressions
          .map(function (item) {
            return { expression: item, distance: damerauLevenshteinDistance(canonical, canonicalizeExpressionName(item.name)) };
          })
          .sort(function (a, b) {
            return a.distance - b.distance;
          });
        const best = ranked[0];
        const second = ranked[1];
        if (!best) return null;
        const target = canonicalizeExpressionName(best.expression.name);
        const confidence = normalizedEditConfidence(canonical, target, best.distance);
        const allowedDistance = best.distance <= 1 || (canonical.length >= 8 && best.distance <= 2);
        const allowedConfidence = confidence >= FALLBACK_THRESHOLDS.presetMinConfidence;
        const uniqueBest = !second || second.distance > best.distance;
        return allowedDistance && allowedConfidence && uniqueBest ? best.expression : null;
      }

      function buildSyntheticExpression(sourceName, canonical) {
        const rawTokens = canonical.split('_').filter(Boolean);
        const tokens = rawTokens.filter(function (token) {
          return !FALLBACK_STOP_TOKENS.has(token);
        });
        if (!tokens.length) return null;

        const rules = buildKeywordRules();
        const slots = {
          face: { value: FALLBACK_DEFAULTS.face, priority: 0, order: -1 },
          mouth: { value: FALLBACK_DEFAULTS.mouth, priority: 0, order: -1 },
          eye: { value: FALLBACK_DEFAULTS.eye, priority: 0, order: -1 },
          brow: { value: FALLBACK_DEFAULTS.brow, priority: 0, order: -1 }
        };
        const listSlots = { other: [] };
        const matchedTokens = [];
        const matchedIndexes = new Set();
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
          match.effects.forEach(function (effect) {
            applyKeywordEffect(effect, slots, listSlots, order);
          });
          if (hasVisualEffect(match.effects)) meaningfulMatches += match.length;
          order += 1;
          index += match.length;
        }

        if (!matchedTokens.length) return null;
        if (!meaningfulMatches) return null;
        if (meaningfulMatches / tokens.length < FALLBACK_THRESHOLDS.syntheticMinTokenMatchRatio) return null;
        const expression = {
          id: 0,
          name: 'exp_' + canonical,
          face: slots.face.value,
          mouth: slots.mouth.value,
          eye: slots.eye.value,
          brow: slots.brow.value,
          synthetic: true,
          sourceName,
          matchedTokens: unique(matchedTokens),
          unmatchedTokens: unique(tokens.filter(function (_, index) {
            return !matchedIndexes.has(index);
          }))
        };
        if (listSlots.other.length) expression.other = listSlots.other;
        return expression;
      }

      function buildKeywordRules() {
        const rules = new Map();
        addExplicitAssetRules(rules, 'face', 'face_', ASSET_REFS.face);
        addExplicitAssetRules(rules, 'mouth', 'mouth_', ASSET_REFS.mouth);
        addExplicitAssetRules(rules, 'eye', 'eye_', ASSET_REFS.eye);
        addExplicitAssetRules(rules, 'brow', 'brow_', ASSET_REFS.brow);
        addExplicitAssetRules(rules, 'other', '', ASSET_REFS.other);
        KEYWORD_RULES.forEach(function (rule) {
          addRuleIfAvailable(rules, rule.alias, rule.effects);
        });
        return rules;
      }

      function addExplicitAssetRules(rules, slot, prefix, names) {
        names.forEach(function (name) {
          const canonical = canonicalizeAssetName(name);
          const stripped = prefix ? canonicalizeAssetName(name.replace(new RegExp('^' + prefix, 'i'), '')) : canonical;
          const effect = { slot, value: name, priority: FALLBACK_PRIORITIES.explicitComponent };
          addRule(rules, canonical, [effect]);
          addRule(rules, stripped, [effect]);
        });
      }

      function addRuleIfAvailable(rules, alias, effects) {
        const available = effects.filter(function (effect) {
          return ASSET_REFS[effect.slot] && ASSET_REFS[effect.slot].includes(effect.value);
        });
        if (available.length) addRule(rules, alias, available);
      }

      function addRule(rules, alias, effects) {
        const canonical = canonicalizeAssetName(alias);
        if (!canonical) return;
        unique([canonical, canonical.replace(/_/g, '')]).forEach(function (item) {
          rules.set(item, (rules.get(item) || []).concat(effects));
        });
      }

      function findRuleMatch(tokens, index, rules) {
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

      function findFuzzyRuleAlias(token, rules) {
        if (token.length < 4) return null;
        const ranked = Array.from(rules.keys())
          .filter(function (alias) { return !alias.includes('_') && alias.length >= 4; })
          .map(function (alias) { return { alias, distance: damerauLevenshteinDistance(token, alias) }; })
          .sort(function (a, b) { return a.distance - b.distance; });
        const best = ranked[0];
        const second = ranked[1];
        if (!best) return null;
        const allowed = best.distance <= FALLBACK_THRESHOLDS.shortTokenMaxDistance ||
          (token.length >= FALLBACK_THRESHOLDS.longTokenMinLength && best.distance <= FALLBACK_THRESHOLDS.longTokenMaxDistance);
        const uniqueBest = !second || second.distance > best.distance;
        return allowed && uniqueBest ? best.alias : null;
      }

      function applyKeywordEffect(effect, slots, listSlots, order) {
        if (effect.slot === 'other') {
          if (!listSlots.other.includes(effect.value)) listSlots.other.push(effect.value);
          return;
        }
        const current = slots[effect.slot];
        if (effect.priority > current.priority || (effect.priority === current.priority && order >= current.order)) {
          slots[effect.slot] = { value: effect.value, priority: effect.priority, order };
        }
      }

      function defaultExpression() {
        return EXP_DATA.expressions.find(function (item) {
          return item.name === DEFAULT_EXPRESSION;
        }) || EXP_DATA.expressions[0];
      }

      function normalizedEditConfidence(a, b, distance) {
        const maxLength = Math.max(a.length, b.length);
        return maxLength ? 1 - distance / maxLength : 1;
      }

      function hasVisualEffect(effects) {
        return effects.some(function (effect) {
          return effect.slot === 'face' ||
            effect.slot === 'mouth' ||
            effect.slot === 'eye' ||
            effect.slot === 'brow' ||
            effect.slot === 'other';
        });
      }

      function damerauLevenshteinDistance(a, b) {
        const previous = Array.from({ length: b.length + 1 }, function (_, index) { return index; });
        const current = Array.from({ length: b.length + 1 }, function () { return 0; });
        const transposed = Array.from({ length: b.length + 1 }, function () { return 0; });
        for (let row = 1; row <= a.length; row += 1) {
          current[0] = row;
          for (let column = 1; column <= b.length; column += 1) {
            const cost = a[row - 1] === b[column - 1] ? 0 : 1;
            let distance = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + cost);
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

      function unique(values) {
        return Array.from(new Set(values.filter(Boolean)));
      }

      function readInitialOutfit() {
        try {
          const params = new URLSearchParams(location.search || '');
          return params.get('outfit') || DEFAULT_OUTFIT;
        } catch (_) {
          return DEFAULT_OUTFIT;
        }
      }

      function readInitialAccessories() {
        try {
          const params = new URLSearchParams(location.search || '');
          const raw = [params.get('accessories'), params.get('accessory'), params.get('acc')].filter(Boolean).join(',');
          const names = new Set(normalizeAccessories(raw));
          ACCESSORY_NAMES.forEach(function (name) {
            const value = params.get(name);
            if (value === '1' || value === 'true' || value === 'on' || value === 'yes') names.add(name);
          });
          return Array.from(names);
        } catch (_) {
          return [];
        }
      }

      function resolveOutfit(value) {
        const requested = String(value || DEFAULT_OUTFIT).trim() || DEFAULT_OUTFIT;
        return ASSET_REFS.base.includes(requested) ? requested : DEFAULT_OUTFIT;
      }

      function normalizeAccessories(value) {
        const raw = Array.isArray(value) ? value.join(',') : typeof value === 'string' ? value : '';
        var maskState = 'no_mask';
        var hasHeadphones = false;
        raw.split(/[,| ]+/).forEach(function (name) {
          if (MASK_ACCESSORY_NAMES.includes(name)) {
            maskState = name;
            return;
          }
          if (name === 'headphones' && ASSET_REFS.other.includes(name)) hasHeadphones = true;
        });
        return hasHeadphones ? [maskState, 'headphones'] : [maskState];
      }

      function getRenderableAccessories() {
        return currentAccessories.filter(function (name) {
          return name !== 'no_mask' && ASSET_REFS.other.includes(name);
        });
      }

      function assetUrl(group, name) {
        const folders = {
          base: 'base',
          face: 'expression/face_fx',
          eye: 'expression/eyes',
          mouth: 'expression/mouth',
          brow: 'expression/brow',
          other: 'expression/other'
        };
        return ASSET_BASE_URL.replace(/\\/+$/, '') + '/' + folders[group] + '/' + encodeURIComponent(name) + '.png';
      }

      function readGlobalString(key) {
        const targets = [window];
        try { targets.push(window.parent); } catch (_) {}
        try { targets.push(window.top); } catch (_) {}
        for (const target of targets) {
          try {
            if (target && typeof target[key] === 'string' && target[key].trim()) return target[key].trim();
          } catch (_) {}
        }
        return '';
      }

      function resolveAssetBaseUrl() {
        const explicit = readGlobalString('DOKUHA_ASSET_BASE_URL');
        if (explicit) return explicit.replace(/\\/+$/, '');
        const appBase = readGlobalString('DOKUHA_APP_BASE_URL');
        if (appBase) return appBase.replace(/\\/+$/, '') + '/dokuha-assets/standing';
        return STATIC_ASSET_BASE_URL;
      }

      function getAutoOtherLayers(face) {
        if (face === 'face_pale') return ['ear_face_pale', 'face_pale_up'];
        if (face === 'face_shadow') return ['face_shadow_up'];
        return [];
      }

      function getExpressionOtherNames(expression) {
        const manualOther = Array.isArray(expression.other)
          ? expression.other
          : expression.other
            ? [expression.other]
            : [];
        const autoOther = getAutoOtherLayers(expression.face);
        return unique([
          ...autoOther,
          ...manualOther.filter(function (name) {
            return !autoOther.includes(name) && !currentAccessories.includes(name);
          })
        ]).filter(function (name) {
          return ASSET_REFS.other.includes(name);
        });
      }

      function getCriticalUrls(expression, outfit) {
        const expressionOther = getExpressionOtherNames(expression);
        const urls = [
          assetUrl('face', 'face_default'),
          expression.face !== 'face_default' ? assetUrl('face', expression.face) : '',
          assetUrl('mouth', expression.mouth || 'mouth_neutral'),
          assetUrl('base', outfit || DEFAULT_OUTFIT),
          assetUrl('eye', expression.eye || 'eye_normal'),
          assetUrl('brow', expression.brow || 'brow_down')
        ];
        expressionOther.forEach(function (name) {
          urls.push(assetUrl('other', name));
        });
        getRenderableAccessories().forEach(function (name) {
          urls.push(assetUrl('other', name));
        });
        return urls.filter(Boolean);
      }

      function getAllAssetUrls() {
        return [].concat(
          ASSET_REFS.base.map(function (name) { return assetUrl('base', name); }),
          ASSET_REFS.face.map(function (name) { return assetUrl('face', name); }),
          ASSET_REFS.mouth.map(function (name) { return assetUrl('mouth', name); }),
          ASSET_REFS.eye.map(function (name) { return assetUrl('eye', name); }),
          ASSET_REFS.brow.map(function (name) { return assetUrl('brow', name); }),
          ASSET_REFS.other.map(function (name) { return assetUrl('other', name); })
        );
      }

      function getCacheRoot() {
        const candidates = [window];
        try { candidates.push(window.parent); } catch (_) {}
        try { candidates.push(window.top); } catch (_) {}
        for (const target of candidates) {
          try {
            if (target && target.Object) return target;
          } catch (_) {}
        }
        return window;
      }

      function warmImageCache(urls) {
        const root = getCacheRoot();
        let cache;
        try {
          cache = root[CACHE_KEY] || (root[CACHE_KEY] = Object.create(null));
        } catch (_) {
          cache = window[CACHE_KEY] || (window[CACHE_KEY] = Object.create(null));
        }

        urls.forEach(function (url) {
          if (!url || cache[url]) return;
          const image = new Image();
          cache[url] = { status: 'loading', image };
          image.decoding = 'async';
          try { image.fetchPriority = 'low'; } catch (_) {}
          image.onload = function () { cache[url].status = 'ready'; };
          image.onerror = function () { cache[url].status = 'error'; };
          image.src = url;
        });
      }

      function scheduleWarmAll() {
        if (warmAllScheduled) return;
        warmAllScheduled = true;
        setTimeout(function () {
          warmImageCache(getAllAssetUrls());
        }, 250);
      }

      function resizeHostFrame() {
        if (!hostFrame) return;
        const size = 'min(220px, 70vw)';
        hostFrame.style.width = size;
        hostFrame.style.maxWidth = '100%';
        hostFrame.style.aspectRatio = '1 / 1';
        hostFrame.style.border = '0';
        hostFrame.style.display = 'block';
        hostFrame.style.margin = '8px 0';
        hostFrame.style.background = 'transparent';
        const rect = hostFrame.getBoundingClientRect();
        const renderedWidth = Math.round(rect.width);
        if (renderedWidth > 0) {
          hostFrame.style.height = renderedWidth + 'px';
          hostFrame.style.maxHeight = renderedWidth + 'px';
        } else {
          hostFrame.style.height = size;
          hostFrame.style.maxHeight = size;
        }
      }

      function makeLayer(src) {
        return src ? { url: src } : null;
      }

      function resolveLayers(expression, outfit) {
        const expressionOther = getExpressionOtherNames(expression);
        return [
          makeLayer(assetUrl('face', 'face_default')),
          expression.face !== 'face_default' ? makeLayer(assetUrl('face', expression.face)) : null,
          makeLayer(assetUrl('mouth', expression.mouth || 'mouth_neutral')),
          makeLayer(assetUrl('base', outfit || DEFAULT_OUTFIT)),
          makeLayer(assetUrl('eye', expression.eye || 'eye_normal')),
          makeLayer(assetUrl('brow', expression.brow || 'brow_down')),
          ...expressionOther.map(function (name) {
            return makeLayer(assetUrl('other', name));
          }),
          ...getRenderableAccessories().map(function (name) {
            return makeLayer(assetUrl('other', name));
          })
        ].filter(Boolean);
      }

      function createStandingCanvas(layers) {
        const canvas = document.createElement('canvas');
        canvas.className = 'dokuha-standing__canvas';
        canvas.width = 2048;
        canvas.height = 2048;
        canvas.setAttribute('aria-hidden', 'true');
        canvas.dataset.layerCount = String(layers.length);
        paintStandingCanvas(canvas, layers);
        return canvas;
      }

      async function paintStandingCanvas(canvas, layers) {
        const images = await Promise.all(layers.map(function (layer) {
          return loadCanvasImage(layer.url);
        }));
        const drawableImages = images.filter(Boolean);
        const firstImage = drawableImages[0];
        const width = firstImage && firstImage.naturalWidth || 2048;
        const height = firstImage && firstImage.naturalHeight || 2048;
        const context = canvas.getContext('2d');
        if (!context) return;

        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;

        context.clearRect(0, 0, width, height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        drawableImages.forEach(function (image) {
          context.drawImage(image, 0, 0, width, height);
        });
        canvas.dataset.rendered = 'true';
      }

      function loadCanvasImage(src) {
        return new Promise(function (resolve) {
          if (!src) {
            resolve(null);
            return;
          }

          let settled = false;
          function done(image) {
            if (settled) return;
            settled = true;
            resolve(image);
          }

          const image = new Image();
          image.decoding = 'async';
          image.loading = 'eager';
          try { image.fetchPriority = 'high'; } catch (_) {}
          image.onload = function () { done(image); };
          image.onerror = function () { done(null); };
          image.src = src;

          if (image.complete && image.naturalWidth > 0) {
            done(image);
          }
        });
      }

      function applyState(state) {
        if (!state || typeof state !== 'object') return false;
        const nextOutfit = resolveOutfit(state.outfit);
        const nextAccessories = normalizeAccessories(state.accessories);
        const outfitChanged = nextOutfit !== currentOutfit;
        const accessoriesChanged = nextAccessories.join(',') !== currentAccessories.join(',');
        if (!outfitChanged && !accessoriesChanged) return false;
        currentOutfit = nextOutfit;
        currentAccessories = nextAccessories;
        render();
        return true;
      }

      function getHostTargets() {
        const targets = [window];
        try { targets.push(window.parent); } catch (_) {}
        try { targets.push(window.top); } catch (_) {}
        return targets.filter(Boolean);
      }

      async function requestDirectState() {
        for (const target of getHostTargets()) {
          try {
            if (target.DOKUHAPlugin && typeof target.DOKUHAPlugin.loadState === 'function') {
              const state = await target.DOKUHAPlugin.loadState({ persist: false });
              if (applyState(state)) return true;
            }
          } catch (_) {}
          try {
            if (target.STBridge && target.STBridge.mvuz && typeof target.STBridge.mvuz.read === 'function') {
              const state = await target.STBridge.mvuz.read('dokuha', { persist: false });
              if (applyState(state)) return true;
            }
          } catch (_) {}
        }
        return false;
      }

      function requestHostState() {
        getHostTargets().forEach(function (target) {
          try {
            if (target && typeof target.postMessage === 'function') {
              target.postMessage({
                type: 'DOKUHA_STATUS_REQUEST',
                appId: 'live-stream',
                reason: 'expressionPortrait'
              }, '*');
            }
          } catch (_) {}
        });
        requestDirectState();
      }

      function render() {
        if (!app) return;
        const expression = resolveExpression(currentExpression);
        app.dataset.expression = expression.name;
        app.dataset.outfit = currentOutfit;
        app.dataset.accessories = currentAccessories.join(',');
        warmImageCache(getCriticalUrls(expression, currentOutfit));
        scheduleWarmAll();

        const frame = document.createElement('section');
        frame.className = 'portrait-frame';
        frame.title = expression.name + ' / ' + currentOutfit;

        const crop = document.createElement('div');
        crop.className = 'portrait-crop';

        const figure = document.createElement('figure');
        figure.className = 'dokuha-standing';
        figure.dataset.outfit = currentOutfit;
        figure.dataset.expression = expression.name;
        figure.dataset.accessories = currentAccessories.join(',');
        figure.setAttribute('aria-label', 'DOKUHA ' + currentOutfit + ' ' + expression.name);
        figure.append(createStandingCanvas(resolveLayers(expression, currentOutfit)));

        crop.append(figure);
        frame.append(crop);
        app.replaceChildren(frame);
      }

      resizeHostFrame();
      render();
      requestHostState();
      setTimeout(requestHostState, 250);
      window.addEventListener('resize', resizeHostFrame);
      window.addEventListener('message', function (event) {
        const data = event && event.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'DOKUHA_STATE_PUSH') {
          applyState(data.state);
          return;
        }
        if (data.type !== 'DOKUHA_EXP_DATA') return;
        currentExpression = resolveExpression(data.expression).name;
        if (data.outfit !== undefined) currentOutfit = resolveOutfit(data.outfit);
        if (data.accessories !== undefined) currentAccessories = normalizeAccessories(data.accessories);
        render();
      });
    })();
  </script>
</body>
</html>
\`\`\`
`;
}

function renderAssetCacheScript(): string {
  return `/**
   * Prewarms DOKUHA expression PNGs into the browser image cache.
   * Generated by scripts/build-dokuha-exp-regex.ts.
 */
(function () {
  'use strict';

  const CURRENT_ROOT = typeof window !== 'undefined' ? window : globalThis;
  const DEFAULT_APP_BASE_URL = 'https://hasheeper.github.io/project-dokuha';
  const ASSET_REFS = ${scriptJson(assetRefs)};
  const CACHE_KEY = '__DOKUHA_EXP_IMAGE_CACHE__';

  function resolveBridgeHost() {
    try { if (CURRENT_ROOT.DOKUHA_ST_HOST) return CURRENT_ROOT.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.DOKUHA_ST_HOST_ROOT?.DOKUHA_ST_HOST) return CURRENT_ROOT.DOKUHA_ST_HOST_ROOT.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.parent?.DOKUHA_ST_HOST) return CURRENT_ROOT.parent.DOKUHA_ST_HOST; } catch (_) {}
    try { if (CURRENT_ROOT.top?.DOKUHA_ST_HOST) return CURRENT_ROOT.top.DOKUHA_ST_HOST; } catch (_) {}
    return {};
  }

  function readGlobalString(key) {
    const targets = [CURRENT_ROOT];
    try { targets.push(CURRENT_ROOT.parent); } catch (_) {}
    try { targets.push(CURRENT_ROOT.top); } catch (_) {}
    for (const target of targets) {
      try {
        if (typeof target?.[key] === 'string' && target[key].trim()) return target[key].trim();
      } catch (_) {}
    }
    return '';
  }

  function trimTrailingSlash(value) {
    return typeof value === 'string' ? value.trim().replace(/\\/+$/, '') : '';
  }

  function resolveAssetBaseUrl() {
    const bridgeHost = resolveBridgeHost();
    const explicit = readGlobalString('DOKUHA_ASSET_BASE_URL');
    if (explicit) return trimTrailingSlash(explicit);
    if (typeof bridgeHost.assetBaseUrl === 'string' && bridgeHost.assetBaseUrl.trim()) {
      return trimTrailingSlash(bridgeHost.assetBaseUrl);
    }
    const appBase = trimTrailingSlash(
      readGlobalString('DOKUHA_APP_BASE_URL')
        || bridgeHost.appBaseUrl
        || DEFAULT_APP_BASE_URL
    );
    return appBase + '/dokuha-assets/standing';
  }

  function assetUrl(baseUrl, group, name) {
    const folders = {
      base: 'base',
      face: 'expression/face_fx',
      eye: 'expression/eyes',
      mouth: 'expression/mouth',
      brow: 'expression/brow',
      other: 'expression/other'
    };
    return baseUrl + '/' + folders[group] + '/' + encodeURIComponent(name) + '.png';
  }

  function getAllAssetUrls(baseUrl) {
    return [].concat(
      ASSET_REFS.base.map((name) => assetUrl(baseUrl, 'base', name)),
      ASSET_REFS.face.map((name) => assetUrl(baseUrl, 'face', name)),
      ASSET_REFS.mouth.map((name) => assetUrl(baseUrl, 'mouth', name)),
      ASSET_REFS.eye.map((name) => assetUrl(baseUrl, 'eye', name)),
      ASSET_REFS.brow.map((name) => assetUrl(baseUrl, 'brow', name)),
      ASSET_REFS.other.map((name) => assetUrl(baseUrl, 'other', name))
    );
  }

  function getCacheRoot() {
    const candidates = [CURRENT_ROOT];
    try { candidates.push(CURRENT_ROOT.parent); } catch (_) {}
    try { candidates.push(CURRENT_ROOT.top); } catch (_) {}
    for (const target of candidates) {
      try {
        if (target && target.Object) return target;
      } catch (_) {}
    }
    return CURRENT_ROOT;
  }

  function warmImageCache(urls) {
    const root = getCacheRoot();
    let cache;
    try {
      cache = root[CACHE_KEY] || (root[CACHE_KEY] = Object.create(null));
    } catch (_) {
      cache = CURRENT_ROOT[CACHE_KEY] || (CURRENT_ROOT[CACHE_KEY] = Object.create(null));
    }

    urls.forEach((url) => {
      if (!url || cache[url]) return;
      const image = new Image();
      cache[url] = { status: 'loading', image };
      image.decoding = 'async';
      try { image.fetchPriority = 'low'; } catch (_) {}
      image.onload = function () { cache[url].status = 'ready'; };
      image.onerror = function () { cache[url].status = 'error'; };
      image.src = url;
    });
  }

  function warmExpressionAssets() {
    const baseUrl = resolveAssetBaseUrl();
    const urls = getAllAssetUrls(baseUrl);
    warmImageCache(urls.slice(0, 8));
    setTimeout(() => warmImageCache(urls.slice(8)), 300);
    return { baseUrl, count: urls.length };
  }

  try {
    const runtime = CURRENT_ROOT.DOKUHAMainRuntime || {};
    runtime.warmExpressionAssets = warmExpressionAssets;
    CURRENT_ROOT.DOKUHAMainRuntime = runtime;
  } catch (_) {}

  const result = warmExpressionAssets();
  try {
    console.info('[DOKUHA Asset Cache] warming expression PNG cache:', result);
  } catch (_) {}
})();
`;
}

for (const output of outputConfigs) {
  fs.mkdirSync(path.dirname(output.file), { recursive: true });
  fs.writeFileSync(output.file, renderHtml(output));
}


fs.mkdirSync(path.dirname(assetCachePath), { recursive: true });
fs.writeFileSync(assetCachePath, renderAssetCacheScript());

console.log(`Wrote ${outputConfigs.length} DOKUHA expression regex wrappers.`);
console.log(`Wrote ${path.relative(rootDir, assetCachePath)}.`);
console.log(`Referenced expressions: ${expData.expressions.length}`);
console.log(`Referenced PNG groups: ${Object.entries(assetRefs).map(([key, values]) => `${key}=${values.length}`).join(', ')}`);
