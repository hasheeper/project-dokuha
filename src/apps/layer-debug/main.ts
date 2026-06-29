import expConfig from '../../assets/png/standing/expression/exp.json';
import { isDokuhaMessage } from '../../protocol/messages';

const MASK_ACCESSORY_NAMES = ['no_mask', 'mask_up', 'mask_down'] as const;
const STACKABLE_ACCESSORY_NAMES = ['headphones'] as const;
const ACCESSORY_NAMES = [...MASK_ACCESSORY_NAMES, ...STACKABLE_ACCESSORY_NAMES] as const;

type DebugMode = 'base' | 'exp';
type AssetGroup = 'base' | 'face_fx' | 'mouth' | 'eyes' | 'brow' | 'other';
type LayerKind = 'face' | 'mouth' | 'base' | 'eye' | 'brow' | 'other' | 'accessory';
type AccessoryName = (typeof ACCESSORY_NAMES)[number];

interface ElementOptions {
  className?: string;
  text?: string;
  attributes?: Record<string, string>;
}

interface ExpressionPreset {
  id: number;
  name: string;
  face: string;
  mouth: string;
  eye: string;
  brow: string;
  other?: string | string[];
}

interface ExpConfig {
  count?: number;
  expressions?: ExpressionPreset[];
}

interface StandingLayer {
  kind: LayerKind;
  group: AssetGroup;
  name: string;
  source: string;
  url?: string;
  required: boolean;
}

const DEFAULT_EXPRESSION: ExpressionPreset = {
  id: 1,
  name: 'exp_default',
  face: 'face_default',
  mouth: 'mouth_neutral',
  eye: 'eye_normal',
  brow: 'brow_down'
};

const OUTFIT_ORDER = ['streetwear_full', 'streetwear_inner', 'nightwear', 'underwear', 'nude'];

const LAYER_Z_INDEX: Record<LayerKind, number> = {
  face: 10,
  mouth: 20,
  base: 30,
  eye: 40,
  brow: 50,
  other: 60,
  accessory: 70
};

const LAYER_LABELS: Record<LayerKind, string> = {
  face: 'face',
  mouth: 'mouth',
  base: 'base',
  eye: 'eye',
  brow: 'brow',
  other: 'other',
  accessory: 'accessory'
};

const DEFAULT_CANVAS_ZOOM = 0.82;
const MIN_CANVAS_ZOOM = 0.25;
const MAX_CANVAS_ZOOM = 3.5;
const CANVAS_ZOOM_STEP = 0.14;

const baseAssets = buildAssetMap(import.meta.glob<string>('../../assets/png/standing/base/*.png', {
  eager: true,
  import: 'default'
}));
const faceAssets = buildAssetMap(import.meta.glob<string>('../../assets/png/standing/expression/face_fx/*.png', {
  eager: true,
  import: 'default'
}));
const mouthAssets = buildAssetMap(import.meta.glob<string>('../../assets/png/standing/expression/mouth/*.png', {
  eager: true,
  import: 'default'
}));
const eyeAssets = buildAssetMap(import.meta.glob<string>('../../assets/png/standing/expression/eyes/*.png', {
  eager: true,
  import: 'default'
}));
const browAssets = buildAssetMap(import.meta.glob<string>('../../assets/png/standing/expression/brow/*.png', {
  eager: true,
  import: 'default'
}));
const otherAssets = buildAssetMap(import.meta.glob<string>('../../assets/png/standing/expression/other/*.png', {
  eager: true,
  import: 'default'
}));

const assetCatalog: Record<AssetGroup, Record<string, string>> = {
  base: baseAssets,
  face_fx: faceAssets,
  mouth: mouthAssets,
  eyes: eyeAssets,
  brow: browAssets,
  other: otherAssets
};

const root = document.querySelector<HTMLElement>('[data-app-id="layer-debug"]');
const expressionPresets = readExpressions(expConfig as ExpConfig);
const expressionCount = expressionPresets.length;
const outfitNames = sortOutfits(Object.keys(baseAssets));

let mode = readMode();
let selectedOutfit = resolveOutfit(readParam('outfit') || 'streetwear_full');
let selectedExpression = resolveExpressionName(readParam('expression') || readParam('exp') || DEFAULT_EXPRESSION.name);
let selectedAccessories = readAccessories();
let searchQuery = readParam('q');
let connectedHostName = '';
let canvasZoom = DEFAULT_CANVAS_ZOOM;
let canvasPanX = 0;
let canvasPanY = 0;
let expressionScrollTop = 0;
let baseScrollTop = 0;

render();
window.addEventListener('message', handleMessage);
window.parent?.postMessage({ type: 'dokuha:app-ready', appId: 'layer-debug' }, '*');

function handleMessage(event: MessageEvent): void {
  if (!isDokuhaMessage(event.data)) return;
  if (event.data.type !== 'dokuha:container-ready') return;
  connectedHostName = event.data.app.name;
  root?.setAttribute('data-host-app', event.data.app.id);
  render();
}

function render(): void {
  if (!root) return;
  captureScrollState();
  root.replaceChildren(renderApp());
  restoreScrollState();
  syncUrlState();
}

function renderApp(): HTMLElement {
  const app = createElement('main', { className: 'layer-debug' });
  app.append(renderHeader(), createElement('div', { className: 'debug-divider' }), renderWorkspace());
  return app;
}

function renderHeader(): HTMLElement {
  const header = createElement('header', { className: 'debug-header' });
  const titleBlock = createElement('div', { className: 'title-block' });
  const title = createElement('h1', { text: 'DOKUHA Layer Debug' });
  const meta = createElement('div', {
    className: 'header-meta',
    text: connectedHostName ? `host: ${connectedHostName}` : 'standalone'
  });
  const tabs = createElement('div', {
    className: 'mode-tabs',
    attributes: { role: 'tablist', 'aria-label': 'debug mode' }
  });

  titleBlock.append(title, meta);
  tabs.append(renderModeButton('base', 'Base'), renderModeButton('exp', 'Exp'));
  header.append(titleBlock, renderHeaderStats(), tabs);
  return header;
}

function renderHeaderStats(): HTMLElement {
  const stats = createElement('div', { className: 'header-stats' });
  const audit = getExpressionAudit(expressionPresets);
  stats.append(
    renderStat('Exp', String(expressionCount)),
    renderStat('Base', String(outfitNames.length)),
    renderStat('Missing', String(audit.missingExpressions.length), audit.missingExpressions.length ? 'warn' : 'ok')
  );
  return stats;
}

function renderStat(label: string, value: string, tone = ''): HTMLElement {
  const stat = createElement('span', { className: `header-stat${tone ? ` header-stat--${tone}` : ''}` });
  stat.append(createElement('em', { text: label }), createElement('strong', { text: value }));
  return stat;
}

function renderModeButton(nextMode: DebugMode, label: string): HTMLButtonElement {
  const button = createElement('button', {
    className: `mode-tab${mode === nextMode ? ' is-active' : ''}`,
    text: label,
    attributes: {
      type: 'button',
      role: 'tab',
      'aria-selected': String(mode === nextMode)
    }
  });
  button.addEventListener('click', () => {
    mode = nextMode;
    render();
  });
  return button;
}

function renderWorkspace(): HTMLElement {
  const workspace = createElement('section', { className: 'debug-workspace' });
  workspace.append(renderPreviewPanel(), mode === 'base' ? renderBaseBrowser() : renderExpressionBrowser());
  return workspace;
}

function renderPreviewPanel(): HTMLElement {
  const expression = getCurrentExpression();
  const layers = resolveStandingLayers(selectedOutfit, expression);
  const missingLayers = layers.filter((layer) => !layer.url);
  const panel = createElement('section', { className: 'preview-panel' });
  const top = createElement('div', { className: 'panel-topline' });
  const title = createElement('div', { className: 'panel-title', text: expression.name });
  const subtitle = createElement('div', { className: 'panel-subtitle', text: selectedOutfit });
  const stage = createElement('div', {
    className: 'preview-stage',
    attributes: { role: 'application', 'aria-label': 'layer preview' }
  });
  const viewport = createElement('div', { className: 'canvas-viewport' });

  viewport.append(renderStandingFigure(layers, expression));
  top.append(title, subtitle, renderLiveLinkActions(expression));
  stage.append(renderCanvasGrid(), viewport, renderCanvasTools(stage, viewport));
  bindCanvasPanZoom(stage, viewport);
  applyCanvasTransform(viewport);
  panel.append(top, stage, renderTagSummary(expression, missingLayers), renderLayerStack(layers));
  return panel;
}

function renderLiveLinkActions(expression: ExpressionPreset): HTMLElement {
  const actions = createElement('div', { className: 'panel-actions' });
  actions.append(
    renderActionButton('Copy URL', () => {
      void copyToClipboard(getLiveStreamUrl(expression).href);
    }),
    renderActionButton('Open Live', () => {
      window.open(getLiveStreamUrl(expression).href, '_blank', 'noopener,noreferrer');
    })
  );
  return actions;
}

function renderActionButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = createElement('button', {
    className: 'action-button',
    text: label,
    attributes: { type: 'button' }
  });
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

function renderCanvasGrid(): HTMLElement {
  return createElement('div', { className: 'canvas-grid', attributes: { 'aria-hidden': 'true' } });
}

function renderCanvasTools(stage: HTMLElement, viewport: HTMLElement): HTMLElement {
  const tools = createElement('div', { className: 'canvas-tools' });
  tools.append(
    renderCanvasButton('-', 'Zoom out', () => setCanvasZoom(canvasZoom - CANVAS_ZOOM_STEP, viewport)),
    createElement('span', { className: 'zoom-readout', text: `${Math.round(canvasZoom * 100)}%` }),
    renderCanvasButton('+', 'Zoom in', () => setCanvasZoom(canvasZoom + CANVAS_ZOOM_STEP, viewport)),
    renderCanvasButton('1:1', 'Actual size', () => setCanvasZoom(1, viewport)),
    renderCanvasButton('Fit', 'Fit to canvas', () => fitCanvas(stage, viewport))
  );
  return tools;
}

function renderCanvasButton(label: string, title: string, onClick: () => void): HTMLButtonElement {
  const button = createElement('button', {
    className: 'canvas-tool',
    text: label,
    attributes: { type: 'button', title, 'aria-label': title }
  });
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
    render();
  });
  return button;
}

function bindCanvasPanZoom(stage: HTMLElement, viewport: HTMLElement): void {
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  stage.addEventListener('pointerdown', (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, select, input')) return;
    isDragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    stage.classList.add('is-dragging');
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener('pointermove', (event) => {
    if (!isDragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    canvasPanX += dx;
    canvasPanY += dy;
    applyCanvasTransform(viewport);
  });

  const stopDrag = (event: PointerEvent): void => {
    if (!isDragging) return;
    isDragging = false;
    stage.classList.remove('is-dragging');
    try {
      stage.releasePointerCapture(event.pointerId);
    } catch (_) {
      // Pointer capture can already be released by the browser.
    }
  };

  stage.addEventListener('pointerup', stopDrag);
  stage.addEventListener('pointercancel', stopDrag);
  stage.addEventListener('wheel', (event) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    setCanvasZoom(canvasZoom + direction * CANVAS_ZOOM_STEP, viewport);
    const readout = stage.querySelector<HTMLElement>('.zoom-readout');
    if (readout) readout.textContent = `${Math.round(canvasZoom * 100)}%`;
  }, { passive: false });
}

function setCanvasZoom(nextZoom: number, viewport: HTMLElement): void {
  canvasZoom = clamp(nextZoom, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM);
  applyCanvasTransform(viewport);
}

function fitCanvas(stage: HTMLElement, viewport: HTMLElement): void {
  const stageRect = stage.getBoundingClientRect();
  const viewportRect = viewport.getBoundingClientRect();
  const unscaledWidth = viewportRect.width / canvasZoom;
  const unscaledHeight = viewportRect.height / canvasZoom;
  const nextZoom = Math.min(
    (stageRect.width * 0.78) / unscaledWidth,
    (stageRect.height * 0.78) / unscaledHeight
  );
  canvasZoom = clamp(nextZoom, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM);
  canvasPanX = 0;
  canvasPanY = 0;
  applyCanvasTransform(viewport);
}

function applyCanvasTransform(viewport: HTMLElement): void {
  viewport.style.transform = `translate(-50%, -50%) translate(${canvasPanX}px, ${canvasPanY}px) scale(${canvasZoom})`;
}

function renderStandingFigure(layers: StandingLayer[], expression: ExpressionPreset): HTMLElement {
  const figure = createElement('figure', {
    className: 'dokuha-standing',
    attributes: {
      'aria-label': `DOKUHA ${selectedOutfit} ${expression.name}`,
      'data-expression': expression.name,
      'data-outfit': selectedOutfit,
      'data-accessories': selectedAccessories.join(',')
    }
  });

  layers.filter((layer) => layer.url).forEach((layer) => {
    const image = document.createElement('img');
    image.className = `standing-layer standing-layer--${layer.kind}`;
    image.src = layer.url || '';
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'eager';
    image.draggable = false;
    figure.append(image);
  });

  return figure;
}

function renderTagSummary(expression: ExpressionPreset, missingLayers: StandingLayer[]): HTMLElement {
  const wrapper = createElement('div', { className: 'tag-summary' });
  wrapper.append(
    renderTag(`base:${selectedOutfit}`),
    renderTag(`face:${expression.face}`),
    renderTag(`mouth:${expression.mouth}`),
    renderTag(`eye:${expression.eye}`),
    renderTag(`brow:${expression.brow}`)
  );

  getAutoOtherTags(expression).forEach((tag) => wrapper.append(renderTag(`auto:${tag}`, 'auto')));
  getManualOnlyOtherTags(expression).forEach((tag) => wrapper.append(renderTag(`other:${tag}`)));
  selectedAccessories.forEach((tag) => wrapper.append(renderTag(`acc:${tag}`, 'accessory')));
  missingLayers.forEach((layer) => wrapper.append(renderTag(`missing:${layer.group}/${layer.name}`, 'warn')));
  if (!missingLayers.length) wrapper.append(renderTag('assets:ok', 'ok'));

  return wrapper;
}

function renderLayerStack(layers: StandingLayer[]): HTMLElement {
  const stack = createElement('section', { className: 'layer-stack' });
  const header = createElement('div', { className: 'stack-header' });
  header.append(
    createElement('span', { text: 'Resolved Stack' }),
    createElement('strong', { text: String(layers.length) })
  );
  stack.append(header);

  layers.forEach((layer, index) => {
    const row = createElement('div', { className: `layer-row${layer.url ? '' : ' is-missing'}` });
    const order = createElement('span', { className: 'layer-order', text: String(index + 1).padStart(2, '0') });
    const label = createElement('div', { className: 'layer-main' });
    label.append(
      createElement('strong', { text: LAYER_LABELS[layer.kind] }),
      createElement('span', { text: `${layer.group}/${layer.name}` })
    );
    row.append(
      order,
      label,
      createElement('span', { className: 'layer-source', text: layer.source }),
      createElement('span', { className: `layer-state${layer.url ? ' is-found' : ' is-missing'}`, text: layer.url ? 'ok' : 'missing' }),
      createElement('span', { className: 'layer-z', text: `z${LAYER_Z_INDEX[layer.kind]}` })
    );
    stack.append(row);
  });

  return stack;
}

function renderBaseBrowser(): HTMLElement {
  const section = createElement('section', { className: 'browser-panel' });
  section.append(renderBaseToolbar(), renderBaseGrid());
  return section;
}

function renderBaseToolbar(): HTMLElement {
  const toolbar = createElement('div', { className: 'toolbar' });
  const controls = createElement('div', { className: 'toolbar-controls' });
  controls.append(renderAccessoryToggles(), renderSearchInput('filter base'));
  toolbar.append(
    createElement('div', { className: 'toolbar-title', text: `Base Assets · ${outfitNames.length}` }),
    controls
  );
  return toolbar;
}

function renderBaseGrid(): HTMLElement {
  const grid = createElement('div', { className: 'base-grid' });
  const needle = searchQuery.trim().toLowerCase();
  const filteredOutfits = outfitNames.filter((outfit) => !needle || outfit.toLowerCase().includes(needle));
  filteredOutfits.forEach((outfit) => grid.append(renderBaseCard(outfit)));
  if (!filteredOutfits.length) grid.append(createElement('div', { className: 'empty-state', text: 'No base assets' }));
  return grid;
}

function renderBaseCard(outfit: string): HTMLButtonElement {
  const button = createElement('button', {
    className: `base-card${selectedOutfit === outfit ? ' is-selected' : ''}`,
    attributes: { type: 'button', 'aria-pressed': String(selectedOutfit === outfit) }
  });
  const thumb = createElement('span', { className: 'base-thumb' });
  const image = document.createElement('img');
  image.src = baseAssets[outfit] || '';
  image.alt = '';
  image.decoding = 'async';
  image.draggable = false;
  thumb.append(image);
  button.append(thumb, createElement('strong', { text: outfit }), renderMiniTag('base'));
  button.addEventListener('click', () => {
    selectedOutfit = outfit;
    render();
  });
  return button;
}

function renderExpressionBrowser(): HTMLElement {
  const filteredExpressions = expressionPresets.filter((expression) => expressionMatchesSearch(expression, searchQuery));
  const section = createElement('section', { className: 'browser-panel' });
  section.append(renderExpressionToolbar(filteredExpressions.length), renderAuditStrip(), renderExpressionList(filteredExpressions));
  return section;
}

function renderExpressionToolbar(filteredCount: number): HTMLElement {
  const titleText = searchQuery
    ? `Exp Presets · ${filteredCount}/${expressionPresets.length}`
    : `Exp Presets · ${expressionPresets.length}`;
  const toolbar = createElement('div', { className: 'toolbar' });
  const controls = createElement('div', { className: 'toolbar-controls' });
  controls.append(renderOutfitSelect(), renderAccessoryToggles(), renderSearchInput('filter exp'));
  toolbar.append(createElement('div', { className: 'toolbar-title', text: titleText }), controls);
  return toolbar;
}

function renderOutfitSelect(): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'outfit-select';
  select.setAttribute('aria-label', 'preview base');
  outfitNames.forEach((outfit) => {
    const option = document.createElement('option');
    option.value = outfit;
    option.textContent = outfit;
    option.selected = outfit === selectedOutfit;
    select.append(option);
  });
  select.addEventListener('change', () => {
    selectedOutfit = resolveOutfit(select.value);
    render();
  });
  return select;
}

function renderSearchInput(placeholder: string): HTMLInputElement {
  const input = document.createElement('input');
  input.className = 'search-input';
  input.type = 'search';
  input.placeholder = placeholder;
  input.value = searchQuery;
  input.addEventListener('input', () => {
    searchQuery = input.value;
    render();
  });
  return input;
}

function renderAccessoryToggles(): HTMLElement {
  const group = createElement('div', {
    className: 'accessory-toggles',
    attributes: { role: 'group', 'aria-label': 'independent accessories' }
  });
  ACCESSORY_NAMES.forEach((accessory) => group.append(renderAccessoryButton(accessory)));
  return group;
}

function renderAccessoryButton(accessory: AccessoryName): HTMLButtonElement {
  const isSelected = selectedAccessories.includes(accessory);
  const button = createElement('button', {
    className: `accessory-toggle${isSelected ? ' is-active' : ''}`,
    text: accessory,
    attributes: {
      type: 'button',
      'aria-pressed': String(isSelected),
      title: accessory
    }
  });
  button.addEventListener('click', () => {
    if (isMaskAccessoryName(accessory)) {
      selectedAccessories = normalizeAccessories([
        accessory,
        ...selectedAccessories.filter((name) => name === 'headphones')
      ]);
    } else {
      selectedAccessories = isSelected
        ? selectedAccessories.filter((name) => name !== accessory)
        : [...selectedAccessories, accessory].sort(compareAccessoryOrder);
      selectedAccessories = normalizeAccessories(selectedAccessories);
    }
    render();
  });
  return button;
}

function renderAuditStrip(): HTMLElement {
  const audit = getExpressionAudit(expressionPresets);
  const strip = createElement('section', { className: `audit-strip${audit.missingExpressions.length ? ' has-warnings' : ''}` });
  strip.append(
    renderAuditItem('configured', String((expConfig as ExpConfig).count ?? expressionCount)),
    renderAuditItem('loaded', String(expressionCount)),
    renderAuditItem('missing exp', String(audit.missingExpressions.length)),
    renderAuditItem('missing refs', String(audit.missingReferences.length))
  );
  return strip;
}

function renderAuditItem(label: string, value: string): HTMLElement {
  const item = createElement('span', { className: 'audit-item' });
  item.append(createElement('em', { text: label }), createElement('strong', { text: value }));
  return item;
}

function renderExpressionList(filtered: ExpressionPreset[]): HTMLElement {
  const list = createElement('div', { className: 'expression-list' });
  filtered.forEach((expression) => list.append(renderExpressionRow(expression)));
  if (!filtered.length) {
    list.append(createElement('div', { className: 'empty-state', text: 'No presets' }));
  }
  return list;
}

function renderExpressionRow(expression: ExpressionPreset): HTMLButtonElement {
  const missing = resolveStandingLayers(selectedOutfit, expression).filter((layer) => !layer.url);
  const button = createElement('button', {
    className: `expression-row${selectedExpression === expression.name ? ' is-selected' : ''}${missing.length ? ' has-missing' : ''}`,
    attributes: { type: 'button', 'aria-pressed': String(selectedExpression === expression.name) }
  });
  const id = createElement('span', { className: 'exp-id', text: `#${expression.id}` });
  const main = createElement('span', { className: 'exp-main' });
  const chips = createElement('span', { className: 'exp-chips' });

  main.append(createElement('strong', { text: expression.name }), chips);
  getExpressionTags(expression).forEach((tag) => chips.append(renderMiniTag(tag)));
  getAutoOtherTags(expression).forEach((tag) => chips.append(renderMiniTag(`auto:${tag}`, 'auto')));
  if (missing.length) chips.append(renderMiniTag(`missing:${missing.length}`, 'warn'));

  button.append(id, main);
  button.addEventListener('click', () => {
    selectedExpression = expression.name;
    render();
  });
  return button;
}

function renderTag(text: string, tone = ''): HTMLElement {
  return createElement('span', { className: `tag${tone ? ` tag-${tone}` : ''}`, text });
}

function renderMiniTag(text: string, tone = ''): HTMLElement {
  return createElement('span', { className: `mini-tag${tone ? ` mini-tag-${tone}` : ''}`, text });
}

function getCurrentExpression(): ExpressionPreset {
  if (mode === 'base') return makeBaseDebugExpression();
  return resolveExpression(selectedExpression);
}

function makeBaseDebugExpression(): ExpressionPreset {
  return {
    ...DEFAULT_EXPRESSION,
    id: 0,
    name: 'debug_base'
  };
}

function resolveStandingLayers(outfit: string, expression: ExpressionPreset): StandingLayer[] {
  const layers: StandingLayer[] = [];
  addLayer(layers, 'face', 'face_fx', 'face_default', 'default.face');
  if (expression.face && expression.face !== 'face_default') {
    addLayer(layers, 'face', 'face_fx', expression.face, 'exp.face');
  }
  addLayer(layers, 'mouth', 'mouth', expression.mouth || DEFAULT_EXPRESSION.mouth, 'exp.mouth');
  addLayer(layers, 'base', 'base', outfit, 'state.outfit');
  addLayer(layers, 'eye', 'eyes', expression.eye || DEFAULT_EXPRESSION.eye, 'exp.eye');
  addLayer(layers, 'brow', 'brow', expression.brow || DEFAULT_EXPRESSION.brow, 'exp.brow');
  getAutoOtherTags(expression).forEach((name) => addLayer(layers, 'other', 'other', name, `auto.${expression.face}`));
  getManualOnlyOtherTags(expression).forEach((name) => addLayer(layers, 'other', 'other', name, 'exp.other', false));
  selectedAccessories
    .filter((name) => name !== 'no_mask')
    .forEach((name) => addLayer(layers, 'accessory', 'other', name, 'accessory', false));
  return layers;
}

function addLayer(
  layers: StandingLayer[],
  kind: LayerKind,
  group: AssetGroup,
  name: string,
  source: string,
  required = true
): void {
  layers.push({
    kind,
    group,
    name,
    source,
    url: assetCatalog[group][name],
    required
  });
}

function getOtherTags(expression: ExpressionPreset): string[] {
  if (Array.isArray(expression.other)) return expression.other.filter(Boolean);
  return expression.other ? [expression.other] : [];
}

function getAutoOtherTags(expression: ExpressionPreset): string[] {
  if (expression.face === 'face_pale') return ['ear_face_pale', 'face_pale_up'];
  if (expression.face === 'face_shadow') return ['face_shadow_up'];
  return [];
}

function getManualOnlyOtherTags(expression: ExpressionPreset): string[] {
  const autoTags = new Set(getAutoOtherTags(expression));
  return getOtherTags(expression).filter((tag) => !autoTags.has(tag));
}

function getExpressionTags(expression: ExpressionPreset): string[] {
  return [
    expression.face,
    expression.mouth,
    expression.eye,
    expression.brow,
    ...getManualOnlyOtherTags(expression)
  ].filter(Boolean);
}

function expressionMatchesSearch(expression: ExpressionPreset, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    String(expression.id),
    expression.name,
    ...getExpressionTags(expression),
    ...getAutoOtherTags(expression)
  ].some((value) => value.toLowerCase().includes(needle));
}

function getExpressionAudit(expressions: ExpressionPreset[]): { missingExpressions: ExpressionPreset[]; missingReferences: string[] } {
  const missingExpressions: ExpressionPreset[] = [];
  const missingReferences = new Set<string>();

  expressions.forEach((expression) => {
    const missing = resolveStandingLayers(selectedOutfit, expression).filter((layer) => !layer.url);
    if (missing.length) missingExpressions.push(expression);
    missing.forEach((layer) => missingReferences.add(`${expression.name}:${layer.group}/${layer.name}`));
  });

  return {
    missingExpressions,
    missingReferences: [...missingReferences].sort((a, b) => a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: 'base'
    }))
  };
}

function readExpressions(config: ExpConfig): ExpressionPreset[] {
  const expressions = Array.isArray(config.expressions) ? config.expressions : [];
  const normalized = expressions
    .filter((item): item is ExpressionPreset => Boolean(
      item &&
        typeof item.id === 'number' &&
        typeof item.name === 'string' &&
        typeof item.face === 'string' &&
        typeof item.mouth === 'string' &&
        typeof item.eye === 'string' &&
        typeof item.brow === 'string'
    ))
    .sort((a, b) => a.id - b.id);
  return normalized.length ? normalized : [DEFAULT_EXPRESSION];
}

function resolveExpression(name: string): ExpressionPreset {
  return expressionPresets.find((expression) => expression.name === name) || DEFAULT_EXPRESSION;
}

function resolveExpressionName(name: string): string {
  return resolveExpression(name).name;
}

function resolveOutfit(name: string): string {
  return outfitNames.includes(name) ? name : outfitNames[0] || 'streetwear_full';
}

function sortOutfits(values: string[]): string[] {
  const known = OUTFIT_ORDER.filter((name) => values.includes(name));
  const rest = values.filter((name) => !OUTFIT_ORDER.includes(name)).sort((a, b) => a.localeCompare(b));
  return [...known, ...rest];
}

function buildAssetMap(modules: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(modules).map(([path, url]) => [getAssetName(path), url]));
}

function getAssetName(path: string): string {
  return path.split('/').pop()?.replace(/\.png$/i, '') || path;
}

function readParam(key: string): string {
  return new URLSearchParams(location.search).get(key) || '';
}

function readAccessories(): AccessoryName[] {
  const params = new URLSearchParams(location.search);
  const raw = [
    params.get('accessories'),
    params.get('accessory'),
    params.get('acc')
  ].filter(Boolean).join(',');
  const names = new Set(raw.split(/[,| ]+/).filter(isAccessoryName));
  ACCESSORY_NAMES.forEach((accessory) => {
    if (isTruthyParam(params.get(accessory))) names.add(accessory);
  });
  return normalizeAccessories([...names]);
}

function isAccessoryName(value: string): value is AccessoryName {
  return ACCESSORY_NAMES.includes(value as AccessoryName);
}

function isMaskAccessoryName(value: string): value is (typeof MASK_ACCESSORY_NAMES)[number] {
  return MASK_ACCESSORY_NAMES.includes(value as (typeof MASK_ACCESSORY_NAMES)[number]);
}

function normalizeAccessories(value: readonly string[]): AccessoryName[] {
  let maskState: AccessoryName = 'no_mask';
  let hasHeadphones = false;
  value.forEach((name) => {
    if (isMaskAccessoryName(name)) {
      maskState = name;
      return;
    }
    if (name === 'headphones') hasHeadphones = true;
  });
  return hasHeadphones ? [maskState, 'headphones'] : [maskState];
}

function isTruthyParam(value: string | null): boolean {
  return value === '1' || value === 'true' || value === 'on' || value === 'yes';
}

function compareAccessoryOrder(a: AccessoryName, b: AccessoryName): number {
  return ACCESSORY_NAMES.indexOf(a) - ACCESSORY_NAMES.indexOf(b);
}

function readMode(): DebugMode {
  return readParam('mode') === 'base' ? 'base' : 'exp';
}

function syncUrlState(): void {
  const next = new URL(location.href);
  next.searchParams.set('mode', mode);
  next.searchParams.set('outfit', selectedOutfit);
  if (mode === 'exp') next.searchParams.set('expression', selectedExpression);
  else next.searchParams.delete('expression');
  if (selectedAccessories.length) next.searchParams.set('accessories', selectedAccessories.join(','));
  else next.searchParams.delete('accessories');
  if (searchQuery) next.searchParams.set('q', searchQuery);
  else next.searchParams.delete('q');
  history.replaceState(null, '', next.href);
}

function getLiveStreamUrl(expression: ExpressionPreset): URL {
  const url = new URL('../live-stream/index.html', location.href);
  url.searchParams.set('standingMode', 'static');
  url.searchParams.set('outfit', selectedOutfit);
  url.searchParams.set('expression', expression.name);
  if (selectedAccessories.length) url.searchParams.set('accessories', selectedAccessories.join(','));
  return url;
}

async function copyToClipboard(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
  } catch (_) {
    const input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly', 'true');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.append(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
}

function captureScrollState(): void {
  const expressionList = root?.querySelector<HTMLElement>('.expression-list');
  const baseGrid = root?.querySelector<HTMLElement>('.base-grid');
  if (expressionList) expressionScrollTop = expressionList.scrollTop;
  if (baseGrid) baseScrollTop = baseGrid.scrollTop;
}

function restoreScrollState(): void {
  const expressionList = root?.querySelector<HTMLElement>('.expression-list');
  const baseGrid = root?.querySelector<HTMLElement>('.base-grid');
  if (expressionList) expressionList.scrollTop = expressionScrollTop;
  if (baseGrid) baseGrid.scrollTop = baseScrollTop;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options: ElementOptions = {}
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([name, value]) => element.setAttribute(name, value));
  }

  return element;
}
