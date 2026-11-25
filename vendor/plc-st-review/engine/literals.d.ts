/**
 * Parse an IEC 61131-3 numeric literal to a JS number, or `null` when the text
 * is not a recognizable numeric literal.
 *
 * `Number.parseFloat` silently mangles several legal ST literal forms — it
 * reads `16#FF` as `16`, `1_000` as `1`, and `2#1010` as `2` — which turns
 * value-comparing checks (array bounds, divisor==0, counter PV==0, loop
 * bounds) into false negatives/positives. This helper handles:
 *
 *   - decimal ints / reals, optionally signed: `42`, `-7`, `3.14`, `1.0e6`
 *   - digit-group separators: `1_000`, `16#FF_FF`
 *   - based (radix) literals, base 2..36: `2#1010`, `8#17`, `16#FF`
 *   - typed literals (prefix stripped): `INT#42`, `UINT#16#FF`, `WORD#16#A0`
 *
 * Non-numeric literals (identifiers, `TRUE`/`FALSE`, `T#5s` time literals,
 * strings) return `null`.
 */
export declare function parseStNumber(raw: string): number | null;
//# sourceMappingURL=literals.d.ts.map