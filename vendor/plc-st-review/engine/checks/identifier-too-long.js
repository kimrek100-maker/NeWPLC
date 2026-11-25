function key(d) {
    return `${d.file}::${d.scope}::${d.name}::${d.line}`;
}
export const identifierTooLong = {
    category: 'IDENTIFIER_TOO_LONG',
    defaultSeverity: 'info',
    run(ctx) {
        const cap = ctx.config.limits.maxIdentifierLength;
        if (cap === null)
            return [];
        const findings = [];
        const before = new Set(ctx.before.declarations.filter((d) => d.name.length > cap).map(key));
        for (const d of ctx.after.declarations) {
            if (d.name.length <= cap)
                continue;
            if (before.has(key(d)))
                continue;
            findings.push({
                severity: 'info',
                category: 'IDENTIFIER_TOO_LONG',
                file: d.file,
                line: d.line,
                summary: `Identifier '${d.name}' is ${d.name.length} characters (cap ${cap}) — PLCopen N6`,
                detail: 'PLCopen N6: set and enforce a team-agreed maximum identifier length so names stay readable and grep-friendly. The cap is `limits.max_identifier_length` in `.plc-st-review.yml`; set it to `0` (or omit it) to disable this check.',
            });
        }
        return findings;
    },
};
//# sourceMappingURL=identifier-too-long.js.map