# DOKUHA SillyTavern Pack

This folder contains the text-side SillyTavern assets for DOKUHA.

- `init/initvar.txt`: initial `stat_data.dokuha` variable template.
- `rules/变量规则.txt`: MVU JSONPatch rules for familiarity and basic status updates.
- `rules/格式规则.txt`: DOKUHA dialogue and expression-diff output format rules.
- `rules/cot.txt`: DOKUHA pre-response planning and post-response variable update check.
- `../dokuha-bridge-loader.js`: JS-Slash-Runner loader for variables, prompt injection, and the floating status window.
- `../regex/DOKUHA_EXP.html` and `../regex/local/DOKUHA_EXP.local.html`: expression-diff HTML regex wrappers.

Runtime state is stored at `stat_data.dokuha`. Familiarity follows the old ERA
point logic scaled by 5; relationship and attachment stages are stored core
states and change only when both the point threshold and story event support it.
Mode and mental state use the old ERA fields: `coreStates.mode` plus
`mentalStates.disorderActive`, `mentalStates.longTermEmotion`, and
`mentalStates.dynamicEmotion`. Expression and standing mode are frontend-only.
