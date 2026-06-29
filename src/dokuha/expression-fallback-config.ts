export const EXPRESSION_FALLBACK_CONFIG = {
  defaults: {
    face: 'face_default',
    mouth: 'mouth_neutral',
    eye: 'eye_normal',
    brow: 'brow_down'
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
    { alias: 'yawn', effects: [{ slot: 'mouth', value: 'mouth_huh_2', priority: 50 }] },
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
    { alias: 'drowsy', effects: [{ slot: 'eye', value: 'eye_half_2', priority: 50 }] },
    { alias: 'sleep', effects: [{ slot: 'eye', value: 'eye_line', priority: 50 }] },
    { alias: 'sleepy', effects: [{ slot: 'eye', value: 'eye_half_2', priority: 50 }] },
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
    },
    {
      alias: 'embarrassed',
      effects: [
        { slot: 'face', value: 'face_blush', priority: 50 },
        { slot: 'mouth', value: 'mouth_awawa', priority: 50 },
        { slot: 'other', value: 'sweat', priority: 50 }
      ]
    }
  ]
} as const;
