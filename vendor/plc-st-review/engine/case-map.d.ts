/**
 * A `Map` whose string keys are matched case-insensitively unless it is
 * constructed with `caseSensitive = true`. Lookups (`get` / `has` / `delete`)
 * normalize the key, so a value can never be stored under one casing and then
 * missed under another — insertion and lookup always agree, which is the
 * failure mode this type exists to prevent.
 *
 * Whether identifiers are case-sensitive is dialect-dependent: generic
 * IEC 61131-3, Beckhoff/TwinCAT and CODESYS treat them as case-insensitive,
 * while B&R Automation Studio is case-sensitive. The symbol table picks the
 * mode from the resolved config (`case_sensitive`), defaulting to insensitive.
 *
 * The *original-cased* key is what gets stored, so iteration (`keys`,
 * `entries`, `values`, `forEach`, `for…of`, `size`) yields the real spelling
 * the author wrote — checks that surface an identifier (e.g. the unknown
 * argument name in CALL_SITE_OUTDATED) keep the user's casing. A separate
 * normalized index maps the folded key back to its stored original.
 */
export declare class CaseMap<V> extends Map<string, V> {
    #private;
    constructor(caseSensitive: boolean);
    get(key: string): V | undefined;
    has(key: string): boolean;
    set(key: string, value: V): this;
    delete(key: string): boolean;
    clear(): void;
}
//# sourceMappingURL=case-map.d.ts.map