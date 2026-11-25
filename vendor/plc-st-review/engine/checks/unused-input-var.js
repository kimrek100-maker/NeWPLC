function isReferencedInScope(name, scope, t) {
    // Count references in the scope, ignoring the declaration line itself.
    for (const ref of t.varReferences) {
        if (ref.scope !== scope)
            continue;
        if (ref.name.toLowerCase() === name.toLowerCase())
            return true;
    }
    return false;
}
function key(d) {
    return `${d.file}::${d.scope}::${d.name.toLowerCase()}`;
}
function isPou(scope, t) {
    return t.pous.get(scope);
}
export const unusedInputVar = {
    category: 'UNUSED_INPUT_VAR',
    defaultSeverity: 'info',
    run(ctx) {
        const findings = [];
        const before = new Set();
        for (const d of ctx.before.declarations) {
            if (d.kind !== 'var_input')
                continue;
            const refs = countRefsExcludingDecl(d.name, d.scope, d.line, ctx.before);
            if (refs === 0 && isPou(d.scope, ctx.before))
                before.add(key(d));
        }
        for (const d of ctx.after.declarations) {
            if (d.kind !== 'var_input')
                continue;
            const refs = countRefsExcludingDecl(d.name, d.scope, d.line, ctx.after);
            if (refs > 0)
                continue;
            if (!isPou(d.scope, ctx.after))
                continue;
            if (before.has(key(d)))
                continue;
            void isReferencedInScope; // (kept for symmetry; not used directly below)
            findings.push({
                severity: 'info',
                category: 'UNUSED_INPUT_VAR',
                file: d.file,
                line: d.line,
                summary: `VAR_INPUT ${d.name} in ${d.scope} is never read in the POU body`,
                detail: 'Either remove the input or replace its usages with the actual logic that should have consumed it.',
            });
        }
        return findings;
    },
};
function countRefsExcludingDecl(name, scope, declLine, t) {
    let n = 0;
    for (const ref of t.varReferences) {
        if (ref.scope !== scope)
            continue;
        if (ref.line === declLine)
            continue;
        if (ref.name.toLowerCase() === name.toLowerCase())
            n += 1;
    }
    return n;
}
//# sourceMappingURL=unused-input-var.js.map