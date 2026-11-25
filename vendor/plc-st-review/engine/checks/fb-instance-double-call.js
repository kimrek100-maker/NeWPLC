const KNOWN_FB_TYPES = new Set([
    'TON',
    'TOF',
    'TP',
    'CTU',
    'CTD',
    'CTUD',
    'R_TRIG',
    'F_TRIG',
    'SR',
    'RS',
]);
function isFbInstance(local, symbols) {
    const t = local.typeText.trim();
    if (KNOWN_FB_TYPES.has(t.toUpperCase()))
        return true;
    return symbols.pous.has(t) && symbols.pous.get(t).kind === 'function_block';
}
function groupCalls(symbols) {
    const map = new Map();
    for (const cs of symbols.callSites) {
        const key = `${cs.file}::${cs.scope}::${cs.callee.toLowerCase()}`;
        const g = map.get(key);
        if (g)
            g.lines.push(cs.line);
        else
            map.set(key, { scope: cs.scope, callee: cs.callee, file: cs.file, lines: [cs.line] });
    }
    return [...map.values()];
}
function isInstanceCallee(callee, scope, symbols) {
    const locals = symbols.pouLocals.get(scope) ?? [];
    return locals.some((l) => l.name.toLowerCase() === callee.toLowerCase() && isFbInstance(l, symbols));
}
function groupKey(g) {
    return `${g.file}::${g.scope}::${g.callee.toLowerCase()}`;
}
export const fbInstanceDoubleCall = {
    category: 'FB_INSTANCE_DOUBLE_CALL',
    defaultSeverity: 'warn',
    run(ctx) {
        const findings = [];
        const beforeBad = new Set();
        for (const g of groupCalls(ctx.before)) {
            if (g.lines.length > 1 && isInstanceCallee(g.callee, g.scope, ctx.before)) {
                beforeBad.add(groupKey(g));
            }
        }
        for (const g of groupCalls(ctx.after)) {
            if (g.lines.length <= 1)
                continue;
            if (!isInstanceCallee(g.callee, g.scope, ctx.after))
                continue;
            if (beforeBad.has(groupKey(g)))
                continue;
            findings.push({
                severity: 'warn',
                category: 'FB_INSTANCE_DOUBLE_CALL',
                file: g.file,
                line: g.lines[g.lines.length - 1],
                summary: `FB instance ${g.callee} called ${g.lines.length} times in ${g.scope}`,
                detail: `An FB instance holds state between calls. Multiple calls in one scan overwrite outputs from earlier calls. Lines: ${g.lines.join(', ')}.`,
            });
        }
        return findings;
    },
};
//# sourceMappingURL=fb-instance-double-call.js.map