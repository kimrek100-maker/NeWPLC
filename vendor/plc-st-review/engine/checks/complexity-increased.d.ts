import type { Check } from '../types.js';
/**
 * Flags a POU whose cyclomatic complexity rose between revisions. Warns on any
 * jump greater than 5; escalates to error when the new value newly crosses the
 * configured error threshold (default 25). Small increases are ignored.
 */
export declare const complexityIncreased: Check;
//# sourceMappingURL=complexity-increased.d.ts.map