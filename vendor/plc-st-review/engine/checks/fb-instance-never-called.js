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
function hasAnyCall(local, symbols) {
    for (const cs of symbols.callSites) {
        if (cs.file !== local.file)
            continue;
        if (cs.callee.toLowerCase() === local.name.toLowerCase())
            return true;
    }
    // Also count member-access invocations like `obj.method()`: but our call
    // sites already capture those via the invocation_statement walk.
    return false;
}
function isMemberRead(local, symbols) {
    // Heuristic: is anything reading the instance's outputs (e.g. T1.Q)?
    for (const ma of symbols.memberAccesses) {
        if (ma.file === local.file && ma.leftText.toLowerCase() === local.name.toLowerCase()) {
            return true;
        }
    }
    return false;
}
function key(local) {
    return `${local.file}::${local.scope}::${local.name.toLowerCase()}`;
}
export const fbInstanceNeverCalled = {
    category: 'FB_INSTANCE_NEVER_CALLED',
    defaultSeverity: 'warn',
    run(ctx) {
        const findings = [];
        const beforeBad = new Set();
        const eligible = (l, t) => isFbInstance(l, t) && !hasAnyCall(l, t) && isMemberRead(l, t);
        for (const [, locals] of ctx.before.pouLocals) {
            for (const l of locals)
                if (eligible(l, ctx.before))
                    beforeBad.add(key(l));
        }
        for (const [, locals] of ctx.after.pouLocals) {
            for (const l of locals) {
                if (!eligible(l, ctx.after))
                    continue;
                if (beforeBad.has(key(l)))
                    continue;
                findings.push({
                    severity: 'warn',
                    category: 'FB_INSTANCE_NEVER_CALLED',
                    file: l.file,
                    line: l.line,
                    summary: `FB instance ${l.name} (${l.typeText}) is read but never invoked`,
                    detail: 'Outputs of an FB only update when the instance is called. Reading e.g. `instance.Q` without calling `instance(...)` returns stale data.',
                });
            }
        }
        return findings;
    },
};
//# sourceMappingURL=fb-instance-never-called.js.map