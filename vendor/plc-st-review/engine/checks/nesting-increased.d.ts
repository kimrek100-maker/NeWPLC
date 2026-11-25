import type { Check } from '../types.js';
/**
 * Flags a POU whose maximum control-structure nesting depth increased and now
 * sits beyond the configured warn threshold (default 5). Escalates to error
 * when the new depth newly crosses the error threshold (default 8).
 */
export declare const nestingIncreased: Check;
//# sourceMappingURL=nesting-increased.d.ts.map