import type { Check } from '../types.js';
/**
 * Flags a POU added in this PR that nothing in the whole project calls.
 * Project-scoped: it needs `ctx.project` (the whole-repo symbol table) to know
 * about callers in files the diff didn't touch, so without `--project-scope`
 * the engine skips it rather than risk a false "nobody calls this". PROGRAMs
 * are excluded, they are entry points. Info-level: an unwired block can be
 * intentional.
 */
export declare const deadPouIntroduced: Check;
//# sourceMappingURL=dead-pou-introduced.d.ts.map