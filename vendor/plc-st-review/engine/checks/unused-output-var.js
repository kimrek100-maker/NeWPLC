function isWritten(d, t) {
    for (const tgt of t.assignmentTargets) {
        if (tgt.scope !== d.scope)
            continue;
        if (tgt.name.toLowerCase() === d.name.toLowerCase())
            return true;
    }
    return false;
}
function key(d) {
    return `${d.file}::${d.scope}::${d.name.toLowerCase()}`;
}
export const unusedOutputVar = {
    category: 'UNUSED_OUTPUT_VAR',
    defaultSeverity: 'info',
    run(ctx) {
        const findings = [];
        const before = new Set();
        for (const d of ctx.before.declarations) {
            if (d.kind !== 'var_output')
                continue;
            if (!isWritten(d, ctx.before))
                before.add(key(d));
        }
        for (const d of ctx.after.declarations) {
            if (d.kind !== 'var_output')
                continue;
            if (isWritten(d, ctx.after))
                continue;
            if (before.has(key(d)))
                continue;
            findings.push({
                severity: 'info',
                category: 'UNUSED_OUTPUT_VAR',
                file: d.file,
                line: d.line,
                summary: `VAR_OUTPUT ${d.name} in ${d.scope} is declared but never written`,
                detail: 'Callers reading this output will only ever see its initial value. Either remove the output or wire it to actual logic.',
            });
        }
        return findings;
    },
};
//# sourceMappingURL=unused-output-var.js.map