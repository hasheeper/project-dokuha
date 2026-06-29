import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import {
  resolveExpressionWithFallback,
  type ExpressionFallbackAssets,
  type ExpressionLayerRef
} from '../src/dokuha/expression-fallback.js';

interface ExpressionData {
  expressions: ExpressionLayerRef[];
}

const rootDir = process.cwd();
const expressionDir = join(rootDir, 'src/assets/png/standing/expression');
const data = JSON.parse(readFileSync(join(expressionDir, 'exp.json'), 'utf8')) as ExpressionData;
const assets: ExpressionFallbackAssets = {
  face: readPngNames(join(expressionDir, 'face_fx')),
  mouth: readPngNames(join(expressionDir, 'mouth')),
  eye: readPngNames(join(expressionDir, 'eyes')),
  brow: readPngNames(join(expressionDir, 'brow')),
  other: readPngNames(join(expressionDir, 'other'))
};

const exact = resolve('exp_jitome_glare');
assert(exact.name === 'exp_jitome_glare' && !exact.synthetic, 'exact preset should remain unchanged');

const normalized = resolve('Exp Jitome Glare');
assert(normalized.name === 'exp_jitome_glare' && !normalized.synthetic, 'normalized preset should resolve');

const tagged = resolve('<dokuha-exp>exp_pout</dokuha-exp>');
assert(tagged.name === 'exp_pout' && !tagged.synthetic, 'tag-wrapped preset should resolve');

const jsonWrapped = resolve('"exp_pout"');
assert(jsonWrapped.name === 'exp_pout' && !jsonWrapped.synthetic, 'json-wrapped preset should resolve');

const presetTypo = resolve('exp_jitome_galre');
assert(presetTypo.name === 'exp_jitome_glare' && !presetTypo.synthetic, 'high-confidence preset typo should resolve');

const synthetic = resolve('exp_jitome_pout');
assert(synthetic.synthetic === true, 'exp_jitome_pout should become synthetic');
assert(synthetic.face === 'face_default', 'synthetic face should default');
assert(synthetic.mouth === 'mouth_pout', 'synthetic pout mouth should resolve');
assert(synthetic.eye === 'eye_jitome_1', 'synthetic jitome eye should resolve');
assert(synthetic.brow === 'brow_up', 'synthetic pout brow should resolve');
assert(synthetic.matchedTokens?.includes('jitome') && synthetic.matchedTokens.includes('pout'), 'synthetic tokens should be recorded');

const singleKeyword = resolve('exp_jitome');
assert(singleKeyword.synthetic === true && singleKeyword.eye === 'eye_jitome_1', 'single keyword should synthesize');

const tokenTypo = resolve('exp_jitmoe_pout');
assert(tokenTypo.synthetic === true && tokenTypo.eye === 'eye_jitome_1' && tokenTypo.mouth === 'mouth_pout', 'token typo should synthesize safely');

const transposition = resolve('exp_smlie');
assert(transposition.synthetic === true && transposition.mouth === 'mouth_smile', 'token transposition should synthesize safely');

const explicitComponents = resolve('exp_eye_star_mouth_pout');
assert(
  explicitComponents.synthetic === true &&
    explicitComponents.eye === 'eye_star' &&
    explicitComponents.mouth === 'mouth_pout',
  'explicit component names should synthesize'
);

const semanticAlias = resolve('exp_embarrassed_sweat');
assert(
  semanticAlias.synthetic === true &&
    semanticAlias.face === 'face_blush' &&
    semanticAlias.mouth === 'mouth_awawa' &&
    asList(semanticAlias.other).includes('sweat'),
  'semantic alias should synthesize blush, awawa, and sweat'
);

const invalid = resolve('exp_totally_fake_unknown');
assert(invalid.name === 'exp_default' && !invalid.synthetic, 'invalid expression should fall back to default');

const lowConfidence = resolve('exp_jitome_totally_fake_unknown');
assert(lowConfidence.name === 'exp_default' && !lowConfidence.synthetic, 'low-confidence synthetic should fall back to default');

assertGeneratedResolverMatches([
  'exp_jitome_glare',
  'Exp Jitome Glare',
  '<dokuha-exp>exp_pout</dokuha-exp>',
  '"exp_pout"',
  'exp_jitome_galre',
  'exp_jitmoe_pout',
  'exp_smlie',
  'exp_eye_star_mouth_pout',
  'exp_embarrassed_sweat',
  'exp_totally_fake_unknown',
  'exp_jitome_totally_fake_unknown'
]);

console.log('DOKUHA expression fallback checks passed.');

function resolve(value: unknown): ExpressionLayerRef {
  return resolveExpressionWithFallback(value, data.expressions, 'exp_default', assets);
}

function readPngNames(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.png'))
    .map((name) => name.replace(/\.png$/i, ''))
    .sort();
}

function asList(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function assertGeneratedResolverMatches(fixtures: unknown[]): void {
  const htmlPath = join(rootDir, 'ST/regex/local/DOKUHA_EXP.local.html');
  const html = readFileSync(htmlPath, 'utf8');
  const scripts = Array.from(html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)).map((match) => match[1]);
  const runtimeScript = scripts.find((script) => script.includes('function resolveExpression(value)'));
  assert(runtimeScript, 'generated local DOKUHA_EXP resolver script should exist');

  const instrumented = runtimeScript.replace(
    /\}\)\(\);\s*$/,
    'window.__DOKUHA_TEST_RESOLVE__ = resolveExpression; })();'
  );
  const sandbox = makeBrowserSandbox();
  vm.runInNewContext(instrumented, sandbox, { filename: htmlPath });
  const resolveGenerated = sandbox.window.__DOKUHA_TEST_RESOLVE__;
  assert(typeof resolveGenerated === 'function', 'generated resolver should be exposed in test sandbox');

  fixtures.forEach((fixture) => {
    const source = summarizeExpression(resolve(fixture));
    const generated = summarizeExpression(resolveGenerated(fixture) as ExpressionLayerRef);
    assert(
      JSON.stringify(source) === JSON.stringify(generated),
      `generated resolver should match source resolver for ${String(fixture)}`
    );
  });
}

function summarizeExpression(expression: ExpressionLayerRef): Record<string, unknown> {
  return {
    name: expression.name,
    face: expression.face,
    mouth: expression.mouth,
    eye: expression.eye,
    brow: expression.brow,
    synthetic: expression.synthetic,
    other: expression.other,
    matchedTokens: expression.matchedTokens,
    unmatchedTokens: expression.unmatchedTokens
  };
}

function makeBrowserSandbox(): Record<string, unknown> & { window: Record<string, unknown> } {
  const app = makeElement('main');
  const dataNode = { textContent: '"exp_default"', innerText: '"exp_default"' };
  const document = {
    getElementById(id: string) {
      if (id === 'dokuha-exp') return dataNode;
      if (id === 'dokuha-exp-app') return app;
      return null;
    },
    createElement(tagName: string) {
      return makeElement(tagName);
    }
  };
  const window: Record<string, unknown> = {
    document,
    frameElement: null,
    parent: null,
    top: null,
    addEventListener() {},
    postMessage() {}
  };
  window.parent = window;
  window.top = window;
  return {
    window,
    document,
    Image: FakeImage,
    URLSearchParams,
    setTimeout() {
      return 0;
    },
    console
  };
}

function makeElement(tagName: string): Record<string, unknown> {
  return {
    tagName: tagName.toUpperCase(),
    className: '',
    title: '',
    style: {},
    dataset: {},
    children: [],
    setAttribute() {},
    append(...children: unknown[]) {
      (this.children as unknown[]).push(...children);
    },
    replaceChildren(...children: unknown[]) {
      this.children = children;
    },
    getContext() {
      return {
        clearRect() {},
        drawImage() {},
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      };
    }
  };
}

function FakeImage(this: {
  decoding: string;
  loading: string;
  fetchPriority: string;
  complete: boolean;
  naturalWidth: number;
  naturalHeight: number;
  onload: (() => void) | null;
  onerror: (() => void) | null;
}): void {
  this.decoding = '';
  this.loading = '';
  this.fetchPriority = '';
  this.complete = true;
  this.naturalWidth = 2048;
  this.naturalHeight = 2048;
  this.onload = null;
  this.onerror = null;
}

Object.defineProperty(FakeImage.prototype, 'src', {
  set(this: { onload: (() => void) | null }, _value: string) {
    this.onload?.();
  }
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
