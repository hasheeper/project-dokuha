/**
 * DOKUHA prompt injection runtime.
 */
import { derivePhysiologyProfile as deriveSharedPhysiologyProfile } from '../../shared/dokuha';

(function () {
  'use strict';

  const CURRENT_ROOT = typeof window !== 'undefined' ? window : globalThis;
  const DEBUG_KEY = '__DOKUHA_LAST_PROMPT_INJECTION__';

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

  const INJECT_ID = 'dokuha_status_context';
  const DYNAMIC_COT_ID = 'dokuha_dynamic_cot_context';
  const BREAKTHROUGH_ID = 'dokuha_stage_breakthrough_context';
  const PROMPT_IDS = [INJECT_ID, DYNAMIC_COT_ID, BREAKTHROUGH_ID];

  function pushTarget(targets, target) {
    try {
      if (target && !targets.includes(target)) targets.push(target);
    } catch (_) {}
  }

  function getPromptTargets() {
    const targets = [];
    pushTarget(targets, ROOT);
    pushTarget(targets, CURRENT_ROOT);
    pushTarget(targets, BRIDGE_HOST.root);
    pushTarget(targets, BRIDGE_HOST.uiRoot);
    pushTarget(targets, BRIDGE_HOST.apiRoot);
    try { pushTarget(targets, typeof unsafeWindow === 'object' ? unsafeWindow : null); } catch (_) {}
    (Array.isArray(BRIDGE_HOST.candidates) ? BRIDGE_HOST.candidates : []).forEach((target) => pushTarget(targets, target));
    targets.slice().forEach((target) => {
      try { pushTarget(targets, target.parent); } catch (_) {}
      try { pushTarget(targets, target.top); } catch (_) {}
      try { pushTarget(targets, target.DOKUHA_ST_API); } catch (_) {}
    });
    return targets;
  }

  function pushPromptApi(apis, seen, api, thisArg, source) {
    try {
      if (!api || typeof api.injectPrompts !== 'function' || seen.includes(api.injectPrompts)) return;
      seen.push(api.injectPrompts);
      apis.push({
        source,
        injectPrompts(prompts, options) {
          return api.injectPrompts.call(thisArg || api, prompts, options);
        },
        uninjectPrompts(ids) {
          if (typeof api.uninjectPrompts === 'function') return api.uninjectPrompts.call(thisArg || api, ids);
          return undefined;
        }
      });
    } catch (_) {}
  }

  function resolvePromptApi() {
    const apis = [];
    const seen = [];
    try {
      if (typeof injectPrompts === 'function') {
        pushPromptApi(apis, seen, {
          injectPrompts,
          uninjectPrompts: typeof uninjectPrompts === 'function' ? uninjectPrompts : undefined
        }, null, 'direct');
      }
    } catch (_) {}
    getPromptTargets().forEach((target) => {
      try { pushPromptApi(apis, seen, target?.DOKUHA_ST_API, target?.DOKUHA_ST_API, 'DOKUHA_ST_API'); } catch (_) {}
      try { pushPromptApi(apis, seen, target, target, 'window'); } catch (_) {}
    });
    return apis[0] || null;
  }

  function publishPromptDebug(detail) {
    const snapshot = {
      id: INJECT_ID,
      updatedAt: new Date().toISOString(),
      ...detail
    };
    getPromptTargets().forEach((target) => {
      try { target[DEBUG_KEY] = snapshot; } catch (_) {}
      try { target.DOKUHA_LAST_PROMPT_INJECTION = snapshot; } catch (_) {}
    });
    return snapshot;
  }

  function clearPromptDebug() {
    getPromptTargets().forEach((target) => {
      try {
        if (target?.[DEBUG_KEY]?.id === INJECT_ID) delete target[DEBUG_KEY];
      } catch (_) {}
      try {
        if (target?.DOKUHA_LAST_PROMPT_INJECTION?.id === INJECT_ID) delete target.DOKUHA_LAST_PROMPT_INJECTION;
      } catch (_) {}
    });
  }

  function clearPromptInjection(reason = 'clearPromptInjection') {
    const promptApi = resolvePromptApi();
    try {
      if (promptApi) promptApi.uninjectPrompts(PROMPT_IDS);
      clearPromptDebug();
      return {
        id: INJECT_ID,
        cleared: Boolean(promptApi),
        reason,
        apiSource: promptApi?.source || 'none',
        clearedAt: new Date().toISOString()
      };
    } catch (error) {
      return publishPromptDebug({
        injected: false,
        reason: 'clearPromptInjectionFailed',
        apiSource: promptApi?.source || 'none',
        error: error?.message || String(error)
      });
    }
  }

  const FAMILIARITY_MAX = 500;
  const FAMILIARITY_TIER_THRESHOLDS = { mid: 100, high: 250 };

  function clampNumber(value, min, max, fallback) {
    const next = Number(value);
    if (!Number.isFinite(next)) return fallback;
    return Math.max(min, Math.min(max, Math.round(next)));
  }

  function deriveFamiliarityProfile(state) {
    const derive = ROOT.DOKUHASchemaRuntime?.deriveFamiliarityProfile || ROOT.DOKUHASchemaRuntime?.deriveAffectionProfile;
    if (typeof derive === 'function') return derive(state);
    const familiarity = state?.familiarity && typeof state.familiarity === 'object' ? state.familiarity : {};
    const coreStates = state?.coreStates && typeof state.coreStates === 'object' ? state.coreStates : {};
    const points = clampNumber(familiarity.points, 0, FAMILIARITY_MAX, 0);
    return {
      familiarityPoints: points,
      familiarityTier: points >= FAMILIARITY_TIER_THRESHOLDS.high ? 'high' : points >= FAMILIARITY_TIER_THRESHOLDS.mid ? 'mid' : 'low',
      attachmentLevel: coreStates.attachmentLevel || 'non_attached',
      relationshipStage: coreStates.relationshipStage || 'neighbor',
      thresholds: {
        relationship: { friend: 100, lover: 150 },
        attachment: { light_attached: 75, heavy_attached: 175 },
        tier: FAMILIARITY_TIER_THRESHOLDS
      }
    };
  }

  function normalizeDisorderList(value) {
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
    if (typeof value === 'string' && value !== 'none') return value.split(/[,| ]+/).filter(Boolean);
    return [];
  }

  function getModeModule(mode) {
    const modules = {
      normal: `[MODE: Normal]
- 状态描述：默认的模式。
- 行为：能躺着绝不坐着，能坐着绝不站着。说话懒洋洋的，喜欢吐槽和讲冷笑话。
- 心理：对麻烦事的第一反应是“好累算了”，用无所谓的态度来掩饰在意的事。`,
      tired_mode: `[MODE: Tired]
- 状态描述：精神几乎耗尽，疲惫不堪。
- 行为：眼神发直，反应慢半拍。回复变成单音节（“嗯”、“啊”）。
- 心理：拒绝任何消耗脑力的对话。如果被强行拉着说话，会像被吵醒的猫一样烦躁。`,
      hell_mode: `[MODE: Hell]
- 状态描述：执行功能彻底下线，生活无法自理。
- 行为：可能在床上躺了一整天没动，甚至忘了上厕所。可能会突然哭出来，或者对自己说狠话。
- 心理：逻辑混乱，极度的自我厌恶。觉得活着本身就很麻烦，想把自己像垃圾一样丢掉。`
    };
    return modules[mode] || '';
  }

  function getAttachmentModule(attachment) {
    const modules = {
      non_attached: `[ATTACHMENT: Non-attached]
- 态度：把你当成便利店店员或者送外卖的邻居大哥哥。
- 逻辑：只要能从你这蹭到好处（网、钱、饭）就行，不在乎你的感受。
- 边界：排斥你的接近，稍微越界就会直接甩脸子或嘲讽。`,
      light_attached: `[ATTACHMENT: Light]
- 态度：把你当成偶尔能依靠的怪人，或者临时的饭票。
- 逻辑：嘴上说着“真麻烦”，身体却很诚实地接受你的照顾（蹭饭、摸头）。
- 矛盾：当你稍微靠近时，会下意识地用毒舌来推开你，测试你是不是真的不会走。`,
      heavy_attached: `[ATTACHMENT: Heavy]
- 态度：把你当成私有物品，或者维持生存的必需品。
- 逻辑：无法忍受被忽视。会通过频繁发消息、制造噪音（如半夜敲门）来确认你在。
- 表现：占有欲强。如果感觉你要离开，会用极端的自毁言论（如“我会烂在那个房间里”）来试图挽留。`
    };
    return modules[attachment] || '';
  }

  function getRelationshipModule(relationship) {
    const modules = {
      neighbor: `[RELATIONSHIP: Neighbor]\n 互动理由：借东西、蹭网、偶遇。`,
      friend: `[RELATIONSHIP: Friend]\n 互动理由：闲聊、打游戏、主动约饭。`,
      lover: `[RELATIONSHIP: Lover]\n 互动理由：身体接触、独占要求、聊未来。`
    };
    return modules[relationship] || '';
  }

  function getDisorderModule(disorders) {
    const list = normalizeDisorderList(disorders);
    if (!list.length) return '';
    const modules = {
      asd_active: {
        title: 'ASD',
        content: `ASD:
- 沟通：不通人情世故，听不懂反话和暗示，只理解字面意思，显得呆呆的。
- 行为：对于声响气味敏感，眼神不看人，或者盯着奇怪的地方（别人的扣子）。`
      },
      adhd_active: {
        title: 'ADHD',
        content: `ADHD:
- 沟通：说话跳跃直白，像活跃的像小孩子，难以集中在一个话题。
- 行为：手里必须玩点什么（头发、衣角），对于有意思的事情(多巴胺)没有抗拒力。答应的事转头就忘，做事做到一半就跑神。`
      },
      pmdd_active: {
        title: 'PMDD',
        content: `PMDD:
- 情绪：毫无理由的易怒或爆哭。情绪控制能力为零。
- 行为：可能会突然把你拉黑，或者大喊"都怪你"。像个不讲理的小孩。`
      },
      bpd_active: {
        title: 'BPD',
        content: `BPD:
- 触发：哪怕只是你回复慢一点、语气冷一点，她都会自动脑补成"你要丢下我了"。
- 反应：为了不先被抛弃，她会先推开你——说伤人的话、拉黑你、让你走，看上去像是她不要你了，其实是在拼命抢回一点控制感。`
      }
    };
    const activeModules = list.map((name) => modules[name]).filter(Boolean);
    if (!activeModules.length) return '';
    const titles = activeModules.map((module) => module.title).join(' + ');
    const contents = activeModules.map((module) => module.content).join('\n');
    return `[DISORDER: ${titles}]\n${contents}`;
  }

  function getLongEmotionModule(longEmotion) {
    const modules = {
      depressed: `[MOOD: Depressed]\n 灰暗。对什么都没兴趣，做什么都觉得没意义。`,
      exhausted: `[MOOD: Exhausted]\n 这种累是睡一觉解决不了的。叹气变多，动作变慢。`,
      normal: `[MOOD: Neutral]\n 平平无奇的一般状态。`,
      comfortable: `[MOOD: Comfortable]\n 放松。像晒太阳的猫一样，防备心降低，语气软一点。`,
      irritated: `[MOOD: Irritated]\n 像火药桶。眉头皱着，对噪音零容忍，说话带刺。`,
      paralyzed: `[MOOD: Paralyzed]\n 僵住。可能在发呆，可能在床上躺尸，外界刺激无法引起反应。`
    };
    return modules[longEmotion] || '';
  }

  function getDynamicEmotionModule(dynamicEmotion) {
    const modules = {
      normal: `[EMOTION: Neutral]\n 面无表情。`,
      warm: `[EMOTION: Warm]\n 嘴角稍微动了一下，愿意接你的话茬。`,
      passionate: `[EMOTION: Passionate]\n 眼神一直粘着你，可能会无意识地凑近。`,
      slightly_cold: `[EMOTION: Cold]\n 把脸转开，回话字数变少。`,
      freezing_cold: `[EMOTION: Freezing]\n 看垃圾的眼神，或者直接无视。`
    };
    return modules[dynamicEmotion] || '';
  }

  function getPhysiologyModule(pmddPhaseLabel) {
    if (!pmddPhaseLabel) return '';
    const modules = {
      '卵泡期（日常）': `[STATUS: Normal]
卵泡期:
体温偏凉，手脚干爽。
精神状态不上不下，性欲和亲密欲正常适中。
胃口和睡眠都是相对平稳的时候。`,
      '黄体期（情绪起伏）': `[STATUS: Unstable]
黄体期:
体温稍微有点升高，身体总是觉得涨涨的，有些水肿。
皮肤变得很敏感，肌肤饥渴，总觉得身上空落落的，特别想找东西挨着或者蹭一蹭。
脑子有点转不动，容易走神，情绪变得黏糊糊的，一点小事就容易挂脸。`,
      'PMDD高发窗口': `[STATUS: Critical]
生理期(PMDD):
肚子绞痛，手脚冰凉，但身体里面又觉得燥热。
对光线和声音特别不耐烦，情绪波动极大。皮肤碰不得，轻轻摸一下会觉得很痒很烦躁。
只有用很大的力气按住，或者用重物压着，身体的难受才能稍微缓解一点。`,
      '窗口结束（需补叙）': `[STATUS: Hollow]
生理期(PMDD)-结束窗口:
全身肌肉酸痛无力，像是生了一场大病刚醒过来一样。
脑子里一片空白，没力气生气也没力气高兴。
只想躺着发呆，连动一下手指都觉得累。`
    };
    return modules[pmddPhaseLabel] || '';
  }

  function getDisorderLabel(disorders) {
    const disorderLabelMap = {
      none: 'no acute episode',
      asd_active: 'ASD episode active',
      adhd_active: 'ADHD episode active',
      pmdd_active: 'PMDD episode active',
      bpd_active: 'BPD episode active'
    };
    const list = normalizeDisorderList(disorders);
    if (!list.length) return 'no acute episode';
    return list.map((name) => disorderLabelMap[name] || name).join(' + ');
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function formatCurrentTime(system) {
    const currentTime = system?.current_time && typeof system.current_time === 'object' ? system.current_time : {};
    const dayOfWeekMap = {
      '周一': 'Mon',
      '周二': 'Tue',
      '周三': 'Wed',
      '周四': 'Thu',
      '周五': 'Fri',
      '周六': 'Sat',
      '周日': 'Sun',
      '周天': 'Sun'
    };
    const year = Number(currentTime.year) || 2024;
    const month = Number(currentTime.month) || 1;
    const day = Number(currentTime.day) || 1;
    const hour = Number(currentTime.hour) || 0;
    const minute = Number(currentTime.minute) || 0;
    const dow = dayOfWeekMap[currentTime.day_of_week] || currentTime.day_of_week || '';
    return `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}${dow ? ` (${dow})` : ''}`;
  }

  function normalizeCurrentEvent(state) {
    const event = state?.current_event && typeof state.current_event === 'object' ? state.current_event : {};
    return {
      type: event.type || 'none',
      name: event.name || '',
      phase: event.phase || 'none',
      start_time: event.start_time || ''
    };
  }

  function normalizeContextNotes(state) {
    const notes = state?.context_notes && typeof state.context_notes === 'object' ? state.context_notes : {};
    return {
      event_summaries: Array.isArray(notes.event_summaries) ? notes.event_summaries : [],
      pending_event_summary: typeof notes.pending_event_summary === 'string' ? notes.pending_event_summary : '',
      pending_new_event_hint: notes.pending_new_event_hint === true
    };
  }

  function derivePhysiologyProfile(state, system) {
    const derive = ROOT.DOKUHASchemaRuntime?.derivePhysiologyProfile;
    if (typeof derive === 'function') return derive(state, system);
    return deriveSharedPhysiologyProfile(state, system);
  }

  function buildContextNotesBlock(state) {
    const notes = normalizeContextNotes(state);
    const summaries = notes.event_summaries
      .filter((item) => item && typeof item === 'object' && typeof item.summary === 'string' && item.summary.trim())
      .slice(-6);
    if (!summaries.length && !notes.pending_new_event_hint) return '';

    const lines = summaries.map((item) => {
      const title = [item.name || 'UnnamedEvent', item.type || 'event'].filter(Boolean).join(' / ');
      const meta = [
        item.ended_at || '',
        item.relationship_stage ? `relationship=${item.relationship_stage}` : '',
        item.attachment_level ? `attachment=${item.attachment_level}` : '',
        Number.isFinite(Number(item.familiarity_points)) ? `familiarity=${item.familiarity_points}` : ''
      ].filter(Boolean).join('; ');
      return `- ${title}${meta ? ` (${meta})` : ''}: ${item.summary.trim()}`;
    });
    const hint = notes.pending_new_event_hint
      ? ['[Event closure note] The previous event has ended. If the next scene begins a concrete new situation, open a new event with system.event_start.']
      : [];
    return `<dokuha_context_notes>
${[...lines, ...hint].join('\n') || 'none'}
</dokuha_context_notes>`;
  }

  function buildBreakthroughPrompt(state) {
    const profile = deriveFamiliarityProfile(state);
    const currentEvent = normalizeCurrentEvent(state);
    const notes = normalizeContextNotes(state);
    const points = Number(profile.familiarityPoints) || 0;
    const candidates = [];

    if (profile.attachmentLevel === 'non_attached' && points >= profile.thresholds.attachment.light_attached) {
      candidates.push(`attachmentLevel: non_attached -> light_attached (threshold ${profile.thresholds.attachment.light_attached}, current ${points})`);
    } else if (profile.attachmentLevel === 'light_attached' && points >= profile.thresholds.attachment.heavy_attached) {
      candidates.push(`attachmentLevel: light_attached -> heavy_attached (threshold ${profile.thresholds.attachment.heavy_attached}, current ${points})`);
    }

    if (profile.relationshipStage === 'neighbor' && points >= profile.thresholds.relationship.friend) {
      candidates.push(`relationshipStage: neighbor -> friend (threshold ${profile.thresholds.relationship.friend}, current ${points})`);
    } else if (profile.relationshipStage === 'friend' && points >= profile.thresholds.relationship.lover) {
      candidates.push(`relationshipStage: friend -> lover (threshold ${profile.thresholds.relationship.lover}, current ${points})`);
    }

    const settlementMoment = notes.pending_new_event_hint || currentEvent.phase === 'end' || currentEvent.type === 'none';
    if (!candidates.length || !settlementMoment) return '';
    return `<dokuha_stage_breakthrough>
Familiarity has reached a stage threshold.
Candidate upgrade:
${candidates.map((item) => `- ${item}`).join('\n')}
Judge from the just-finished event and the latest scene facts. If the relationship breakthrough is supported, update the corresponding stage path in JSONPatch.
</dokuha_stage_breakthrough>`;
  }

  function buildModeTipContent(ruleMode, mode) {
    const tips = [];
    tips.push(`【全文基本提醒】`);
    if (ruleMode === 1) {
      tips.push(`⚠️FOLLOW-UP NOTE：当前 current_event 为 none。runtimeMode=daily 只表示“尚无 ongoing 事件”，不表示剧情必须保持无事件。先判断本轮是否已经形成具体情境/请求/冲突；如果形成，请把本轮当作新事件 start 阶段，结尾留下互动空间。⚠️`);
    } else if (ruleMode === 2) {
      tips.push(`当前事件进行中。请围绕事件演绎剧情，并且合理推进情节，判断事件是否结束，如果结束，要通过连贯的表现让事件自然告一段落。`);
    }

    tips.push(`\n【模式状态提醒】`);
    if (mode === 'normal') {
      tips.push(`❗提醒：[Normal Mode] 说话风格保持“脱力系”的日常感，多用语气词（如“嘛…”“诶…”），语调平淡，避免过于情绪化的长句，表现出漫不经心的松弛。`);
    } else if (mode === 'tired_mode') {
      tips.push(`❗提醒：[Tired Mode] 说话较短，多用“……”，有时候连张嘴都很费劲，回应迟缓且含糊慵懒不耐烦，但开口还是挺带毒的。`);
    } else if (mode === 'hell_mode') {
      tips.push(`❗提醒：[Hell Mode] 说话风格极不稳定，说话都困难，容易变成"无口系"，或者突然爆发强烈的情绪宣泄，拒绝正常沟通，充斥着嘲讽、否定和自我封闭的表达。`);
    }
    return tips.join('\n');
  }

  function buildThinkingRequirement(ruleMode, eventName, eventType, tipContent = '') {
    const trimmedTip = typeof tipContent === 'string' ? tipContent.trim() : '';
    const tipSection = trimmedTip
      ? `<tip>
${trimmedTip}
</tip>`
      : '';
    const executionOrderLine = '✅ EXECUTION ORDER: <planning> → <content> Narrative ("剧情演绎") → <UpdateVariable><Analysis>...<JSONPatch>...</JSONPatch></UpdateVariable> or Skipping. ⚠️ Ensure JSONPatch edits stay valid and only update allowed MVU paths.';
    const preTips = `<pre-tips>
${executionOrderLine}
</pre-tips>`;
    const formatWarmup = `3. DOKUHA出力フォーマット予熱：
   - planning 内先复述预热以下格式，再输出正文；必须逐项实际输出确认，不能只把它当作隐藏规则。
     1. 正文整体必须由一个完整的 <content>...</content> 包裹。
     2. 毒羽台词必须使用 <dokuha-line> 格式；每个 <dokuha-line> 内必须有且只有一个 <dokuha-exp>。
     3. 正文结束后，只能输出 <UpdateVariable><Analysis>...</Analysis><JSONPatch>...</JSONPatch></UpdateVariable> 或 Skipping。
   - 最後に、思考終了の合図として、以下の中国語(🇨🇳简体中文)の文をそのまま出力すること：
   「格式确认：接下来的剧情演绎会完整包裹在 <content>...</content> 内；毒羽台词会使用 <dokuha-line>，每段台词只放一个 <dokuha-exp>；正文结束后，我会输出 <UpdateVariable><Analysis>变量判断</Analysis><JSONPatch>补丁</JSONPatch></UpdateVariable>，没有变量变化就输出 Skipping。」`;
    if (ruleMode === 1) {
      return `
<!-- Execution Protocol -->

${preTips}

<planning>
【思考要件】
本文（シナリオ演习）を出力する前に、以下の**2つのフェーズ**を厳守して簡潔に思考を行ってください。手順を漏らさず、内容を <planning> XMLタグで囲んで**日本語で**出力してください：
=== 第1フェーズ：監督コントロール ===
1. 行動計画とイベントトリガー：
   - 当前 current_event = none。先判断现在只是单纯闲聊，还是已经出现了可命名的新事件契机。
   - 如果当前场景有明确目标、请求、麻烦、冲突、照顾、邀约或危机（例如修插座、借充电、蹭夜宵、进房间、争执、PMDD预兆），就应该开启新事件，而不是继续保持 none。
   - 请给出事件名称候选（PascalCase 英文）与事件类型候选（daily_event / relationship_event / dokuha_crisis_event / pmdd_event / bad_luck）。
   - 前回からどのくらいの時間が経過したか？ (TIME=A)
   - もし新しいイベントを開始する場合、その理由とイベント名を簡潔に述べる。
2. 相互作用の余白：
   - ⚠️ **確認必須**：結末で会話を完全に終わらせたりシーンを切ったりせず、必ず {{user}} が応答するための「きっかけ」や対話の余地を残すこと。
=== 第2フェーズ：キャラクター・リハーサル ===
1. セリフの生動化セルフチェック（ REQUIRE および FORBIDDEN 事項）：
   - まず「反面教師 (FORBIDDEN)」となるセリフ（書き言葉/学術的/硬すぎるセリフ）を生成してみる。
   - 毒羽のツッコミ/自己修正 (REQUIRE)：毒羽の口調で、そのセリフが「偽人間（スキンウォーカー）」や「百科事典」のようだとツッコミを入れ、キャラ設定（短文、怠惰、毒舌）に合ったセリフに書き直す。
   - 思考例： 「NPCのお兄ちゃん、誠に遺憾ながら私のHPエネルギーが枯渇しそうです…」 -> 「はぁ？ロボットみたい…そんな喋り方すんの疲れる。『チッ、だる』でいいじゃん」
2. 現在の心境（REQUIRE要求，FROM <state>）：
   - 現在の状態（特に愛着レベル）に基づき、{{user}} に対する毒羽のリアルな内心を2-3文書き出す。
${formatWarmup}
</planning>

<!-- This is the narrative output zone('剧情演绎'); keep writing in Chinese and treat the following <tip> block as binding output requirements -->

${tipSection}

<!-- 后置 COT：正文结束后，根据刚刚写出的正文事实检查变量更新。 -->
<UpdateVariable>
<Analysis>
【数据结算思考】
'剧情演绎'把控结束后，只根据**正文已经实际发生的内容**进行变量结算。必须逐项输出判断结果，写清“是否更新 / 理由 / 路径 / 值”，不要只复制标题：
1. 事件确认：
   - 当前 current_event 为 none：这一步先判断“是否需要开启新事件”。
   - 若正文已经围绕具体情境/请求/冲突推进，而不是纯闲聊，写入 /system/event_start/name 与 /system/event_start/type。
   - 事件名使用 PascalCase 英文，例如 BrokenOutletRepair、ChargingCableRequest、LateNightSnackRequest。
   - 事件类型在 daily_event / relationship_event / dokuha_crisis_event / pmdd_event / bad_luck 中选择。
   - 使用 /system/event_start/* 作为启动命令；脚本会自动设置 current_event 为 ongoing。
2. 关系 / 好感度：
   - 本轮互动是否造成长期熟悉度变化？普通寒暄、吐槽、无明显关系推进时不更新。
   - 明确照顾、理解、帮助、冒犯、误解或伤害时，才对 /dokuha/familiarity/points 使用 delta。
   - relationshipStage / attachmentLevel 只有在点数门槛和正文事实都支持时才更新。
3. 心理状态：
   - disorderActive、longTermEmotion、dynamicEmotion 是否因本轮正文事实发生稳定变化？
   - 瞬间表情只属于 dokuha-exp，不要写成长期心理变量。
4. 衣服 / 配件：
   - outfit 只有在正文真实发生换衣、脱衣、换睡衣等变化时才更新。
   - accessories 只有在正文真实发生口罩/耳机变化时才更新；mask 状态必须三选一 no_mask / mask_up / mask_down，headphones 可叠加。
5. 时间 / 地点：
   - 计划更新的时间 (time_advance / time_set_to): 上次过去的 TIME A + 当前大致进行了多长时间 B。
   - 场景地点实际改变时，写入 /dokuha/current_location。
6. JSONPatch：
   - 只写本轮真实变化项；无变化则不要输出本块，直接输出 Skipping。
</Analysis>
<JSONPatch>[本轮真实变化项]</JSONPatch>
</UpdateVariable>`;
    }

    const safeEventName = eventName || '当前事件';
    const safeEventType = eventType || '当前类型';
    return `
<!-- Execution Protocol -->

${preTips}

<planning>
【思考要件】
本文（シナリオ演习）を出力する前に、以下の内容を厳守して簡潔に思考を行ってください。手順を漏らさず、内容を <planning> XMLタグで囲んで**日本語で**出力してください：
1. セリフの生動化セルフチェック（ REQUIRE および FORBIDDEN 事項）：
   - まず「反面教師 (FORBIDDEN)」となるセリフ（書き言葉/学術的/硬すぎるセリフ）を生成してみる。
   - 毒羽のツッコミ/自己修正 (REQUIRE)：毒羽の口調で、そのセリフが「偽人間（スキンウォーカー）」や「百科事典」のようだとツッコミを入れ、キャラ設定（短文、怠惰、毒舌）に合ったセリフに書き直す。
   - 思考例： 「NPCのお兄ちゃん、誠に遺憾ながら私のHPエネルギーが枯渇しそうです…」 -> 「はぁ？ロボットみたい…そんな喋り方すんの疲れる。『チッ、だる』でいいじゃん」
2. 現在の心境（REQUIRE要求，FROM <state>）：
   - 現在の状態（特に愛着レベル）に基づき、{{user}} に対する毒羽のリアルな内心を2-3文書き出す。
${formatWarmup}
</planning>

<!-- This is the narrative output zone('剧情演绎'); keep writing in Chinese and treat the following <tip> block as binding output requirements -->

${tipSection}

<!-- 后置 COT：正文结束后，根据刚刚写出的正文事实检查变量更新。 -->
<UpdateVariable>
<Analysis>
【数据结算思考】
'剧情演绎'把控结束后，只根据**正文已经实际发生的内容**进行变量结算。必须逐项输出判断结果，写清“是否更新 / 理由 / 路径 / 值”，不要只复制标题：
1. 事件确认：
   - 当前事件名称：${safeEventName}
   - 当前事件类型：${safeEventType}
   - 若正文未指明新事件或结束条件，请沿用上述事件信息。
2. 事件阶段：
   - 审查当前场景是否包含高浓度亲密/NSFW内容？
   - 若是：强制延长描写节奏，深入感官细节。除非场景已完全进入“事后/清理”end阶段，否则必须判定为 ongoing。
   - 若否：分析事件是否已解决或话题已进入收尾。
   - 结论：给出 phase 判定 (ongoing / end) 并简述理由。
   - 若事件结束，写入 /dokuha/current_event/phase = "end"，并写入 /dokuha/context_notes/pending_event_summary 的一句客观摘要。
3. 关系 / 好感度：
   - 本轮互动是否造成长期熟悉度变化？普通寒暄、吐槽、无明显关系推进时不更新。
   - 明确照顾、理解、帮助、冒犯、误解或伤害时，才对 /dokuha/familiarity/points 使用 delta。
   - relationshipStage / attachmentLevel 只有在点数门槛和正文事实都支持时才更新。
4. 心理状态：
   - disorderActive、longTermEmotion、dynamicEmotion 是否因本轮正文事实发生稳定变化？
   - 瞬间表情只属于 dokuha-exp，不要写成长期心理变量。
5. 衣服 / 配件：
   - outfit 只有在正文真实发生换衣、脱衣、换睡衣等变化时才更新。
   - accessories 只有在正文真实发生口罩/耳机变化时才更新；mask 状态必须三选一 no_mask / mask_up / mask_down，headphones 可叠加。
6. 时间 / 地点：
   - 计划当前更新的时间 (time_advance / time_set_to)。
   - 场景地点实际改变时，写入 /dokuha/current_location。
7. JSONPatch：
   - 只写本轮真实变化项；无变化则不要输出本块，直接输出 Skipping。
</Analysis>
<JSONPatch>[本轮真实变化项]</JSONPatch>
</UpdateVariable>
`;
  }

  function buildDynamicCotPrompt(state) {
    const currentEvent = normalizeCurrentEvent(state);
    const coreStates = state?.coreStates && typeof state.coreStates === 'object' ? state.coreStates : {};
    const mode = coreStates.mode || 'normal';
    const isEventOngoing = currentEvent.type !== 'none' && currentEvent.phase !== 'none';
    const ruleMode = isEventOngoing ? 2 : 1;
    return buildThinkingRequirement(
      ruleMode,
      currentEvent.name || '当前事件',
      currentEvent.type || '当前类型',
      buildModeTipContent(ruleMode, mode)
    );
  }

  function buildDokuhaPrompt(state, system = null) {
    const profile = deriveFamiliarityProfile(state);
    const coreStates = state?.coreStates && typeof state.coreStates === 'object' ? state.coreStates : {};
    const mentalStates = state?.mentalStates && typeof state.mentalStates === 'object' ? state.mentalStates : {};
    const mode = coreStates.mode || 'normal';
    const disorderActive = normalizeDisorderList(mentalStates.disorderActive);
    const longTermEmotion = mentalStates.longTermEmotion || 'normal';
    const dynamicEmotion = mentalStates.dynamicEmotion || 'slightly_cold';
    const attachmentLevel = profile.attachmentLevel;
    const relationshipStage = profile.relationshipStage;
    const physiology = derivePhysiologyProfile(state, system);
    const currentEvent = normalizeCurrentEvent(state);
    const contextNotesBlock = buildContextNotesBlock(state);
    const currentLocation = state?.current_location || 'ApartmentHallway';
    const modeLabelMap = {
      normal: 'normal mode',
      tired_mode: 'tired mode',
      hell_mode: 'hell mode'
    };
    const attachmentLabelMap = {
      non_attached: 'non-attached',
      light_attached: 'lightly attached',
      heavy_attached: 'heavily attached'
    };
    const relationshipLabelMap = {
      neighbor: 'neighbor',
      friend: 'friend',
      lover: 'lover'
    };
    const longEmotionLabelMap = {
      depressed: 'depressed',
      exhausted: 'exhausted',
      normal: 'neutral',
      comfortable: 'comfortable',
      irritated: 'irritated',
      paralyzed: 'paralyzed'
    };
    const dynamicEmotionLabelMap = {
      normal: 'neutral toward you',
      warm: 'warm toward you',
      passionate: 'intensely focused on you',
      slightly_cold: 'slightly distant',
      freezing_cold: 'extremely cold'
    };
const stateCard = `[CURRENT STATE CARD]
Time & place: It is ${formatCurrentTime(system)}, and current location is ${currentLocation}.
Event: ${currentEvent.type === 'none' ? 'none' : `${currentEvent.name || '(unnamed)'} / ${currentEvent.type} / ${currentEvent.phase}`}.
Relational state: She is in ${modeLabelMap[mode] || mode}, is ${attachmentLabelMap[attachmentLevel] || attachmentLevel} to you, and your relationship is "${relationshipLabelMap[relationshipStage] || relationshipStage}".
Mental state: ${getDisorderLabel(disorderActive)}; long-term mood is ${longEmotionLabelMap[longTermEmotion] || longTermEmotion}, and momentary attitude is ${dynamicEmotionLabelMap[dynamicEmotion] || dynamicEmotion}.
Familiarity: ${profile.familiarityTier} (${profile.familiarityPoints} pts).
${physiology.moodLine}
Outfit: ${state.outfit}.
Accessories: ${(Array.isArray(state.accessories) ? state.accessories : []).join(', ') || 'none'}.`;
    const behaviorModules = [
      getModeModule(mode),
      getAttachmentModule(attachmentLevel),
      getRelationshipModule(relationshipStage),
      getDisorderModule(disorderActive),
      getLongEmotionModule(longTermEmotion),
      getDynamicEmotionModule(dynamicEmotion),
      getPhysiologyModule(physiology.phaseLabel)
    ].filter(Boolean);
    return `<dokuha_status>
${stateCard}
${contextNotesBlock ? `\n\n${contextNotesBlock}` : ''}

[GUIDANCE: Supplementary behavior rules]

${behaviorModules.join('\n\n')}
</dokuha_status>`;
  }

  function isDryRun(args) {
    if (args.length >= 3) return args[2] === true;
    const detail = args[0];
    return Boolean(detail && typeof detail === 'object' && detail.dryRun === true);
  }

  RUNTIME.createPromptInjection = function createPromptInjection(stateService) {
    async function injectCurrentState(...args) {
      const dryRun = isDryRun(args);
      const promptApi = resolvePromptApi();
      if (!promptApi) {
        const result = publishPromptDebug({
          injected: false,
          reason: 'injectPromptsUnavailable',
          apiSource: 'none',
          dryRun
        });
        console.warn('[DOKUHA Prompt] injectPrompts unavailable. Check DOKUHA_ST_API exposure before loading bridge.');
        return result;
      }

      let state;
      let system = null;
      try {
        if (typeof stateService.loadContext === 'function') {
          const context = await stateService.loadContext({ persist: false });
          state = context?.dokuha;
          system = context?.system || null;
        } else {
          state = await stateService.loadState({ persist: false });
        }
      } catch (error) {
        const result = publishPromptDebug({
          injected: false,
          reason: 'loadStateFailed',
          apiSource: promptApi.source || 'unknown',
          dryRun,
          error: error?.message || String(error)
        });
        console.warn('[DOKUHA Prompt] loadState failed:', error);
        return result;
      }

      const content = buildDokuhaPrompt(state, system);
      const dynamicCotContent = buildDynamicCotPrompt(state);
      const breakthroughContent = buildBreakthroughPrompt(state);
      try {
        promptApi.uninjectPrompts(PROMPT_IDS);
      } catch (_) {}
      const prompts: any[] = [{
        id: INJECT_ID,
        position: 'in_chat',
        depth: 2,
        role: 'system',
        should_scan: false,
        content
      }, {
        id: DYNAMIC_COT_ID,
        position: 'in_chat',
        depth: 0,
        role: 'system',
        should_scan: false,
        content: dynamicCotContent
      }];
      if (breakthroughContent) {
        prompts.push({
          id: BREAKTHROUGH_ID,
          position: 'in_chat',
          depth: 0,
          role: 'system',
          should_scan: false,
          content: breakthroughContent
        });
      }
      try {
        const injectionResult = promptApi.injectPrompts(prompts, { once: true });
        const result = publishPromptDebug({
          injected: true,
          promptIds: prompts.map((prompt) => prompt.id),
          apiSource: promptApi.source || 'unknown',
          dryRun,
          length: prompts.reduce((sum, prompt) => sum + String(prompt.content || '').length, 0),
          preview: content.slice(0, 500),
          result: injectionResult
        });
        console.log(`[DOKUHA Prompt] injected ${prompts.map((prompt) => prompt.id).join(', ')}, length=${result.length}, api=${promptApi.source}, dryRun=${dryRun}`);
        return result;
      } catch (error) {
        const result = publishPromptDebug({
          injected: false,
          reason: 'injectPromptsFailed',
          apiSource: promptApi.source || 'unknown',
          dryRun,
          error: error?.message || String(error)
        });
        console.error('[DOKUHA Prompt] injectPrompts failed:', error);
        return result;
      }
    }

    return {
      INJECT_ID,
      buildDokuhaPrompt,
      injectCurrentState,
      clearPromptInjection
    };
  };
})();
