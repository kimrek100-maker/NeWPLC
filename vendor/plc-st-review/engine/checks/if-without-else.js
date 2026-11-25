function key(s) {
    return `${s.file}::${s.line}`;
}
export const ifWithoutElse = {
    category: 'IF_WITHOUT_ELSE',
    defaultSeverity: 'info',
    run(ctx) {
        const findings = [];
        const before = new Set(ctx.before.ifStatements.filter((s) => !s.hasElse).map(key));
        for (const s of ctx.after.ifStatements) {
            if (s.hasElse)
                continue;
            if (before.has(key(s)))
                continue;
            findings.push({
                severity: 'info',
                category: 'IF_WITHOUT_ELSE',
                file: s.file,
                line: s.line,
                summary: 'IF statement without an ELSE clause (PLCopen L17)',
                detail: 'PLCopen L17: every IF should have a final ELSE clause, even if empty, so the "what if neither branch holds" path is explicit. Add an `ELSE ;` (or with a comment explaining the no-op) when there is truly nothing to do.',
            });
        }
        return findings;
    },
};
//# sourceMappingURL=if-without-else.js.map