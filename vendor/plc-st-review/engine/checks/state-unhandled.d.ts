import type { Check } from '../types.js';
/**
 * STATE_UNHANDLED. A `CASE` on an enum has no ELSE branch and does not cover
 * every enum value that exists in the new revision. Unlike ENUM_VALUE_ADDED,
 * which fires only when the enum gained a value, this check also fires for
 * pre-existing gaps: if your enum has five states and you only switch on three,
 * you'll hear about it.
 */
export declare const stateUnhandled: Check;
//# sourceMappingURL=state-unhandled.d.ts.map