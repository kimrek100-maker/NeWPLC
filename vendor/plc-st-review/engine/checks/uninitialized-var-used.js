// PLCopen CP3 — every variable shall be initialised before being used.
//
// Heuristic (deliberate; not a full data-flow analyser):
//   1. We only look at non-input, non-in-out locals — VAR_INPUT and
//      VAR_IN_OUT are guaranteed initialised by the caller, and VAR_GLOBAL
//      / VAR_EXTERNAL initialisation is the global owner's responsibility.
//   2. A declaration with an explicit initial value (`x : INT := 0;`)
//      counts as initialised at the declaration line.
//   3. Otherwise we scan the POU's source positions: a read whose line
//      comes BEFORE the first assignment line is reported.
// The heuristic misses cases that depend on control flow (`IF cond THEN
// x := 1; END_IF; y := x;`) — that needs real reaching-defs analysis and
// is out of scope here. The audit notes the limitation.
const SEED_KINDS = new Set(['var_local', 'var_output', 'var_temp']);
function firstAssignLine(decl, assigns) {
    let best = null;
    for (const a of assigns) {
        if (a.file !== decl.file)
            continue;
        if (a.scope !== decl.scope)
            continue;
        if (a.name.toLowerCase() !== decl.name.toLowerCase())
            continue;
        if (best === null || a.line < best)
            best = a.line;
    }
    return best;
}
function firstReadLine(decl, refs) {
    let best = null;
    for (const r of refs) {
        if (r.file !== decl.file)
            continue;
        if (r.scope !== decl.scope)
            continue;
        if (r.context !== 'read')
            continue;
        if (r.name.toLowerCase() !== decl.name.toLowerCase())
            continue;
        // Skip the declaration line itself — identifiers there appear as refs.
        if (r.line === decl.line)
            continue;
        if (best === null || r.line < best)
            best = r.line;
    }
    return best;
}
function isUninitialisedRead(decl, initialAtDecl, t) {
    if (initialAtDecl)
        return null;
    const firstAssign = firstAssignLine(decl, t.assignmentTargets);
    const firstRead = firstReadLine(decl, t.varReferences);
    if (firstRead === null)
        return null; // never read → handled by UNUSED_*
    if (firstAssign === null)
        return firstRead; // read but never assigned
    return firstRead < firstAssign ? firstRead : null;
}
function declHasInitialValue(d, t) {
    // The decl came from pouLocals (which carries `initial`) OR from a POU
    // parameter (Pou.inputs / outputs / inOuts carry it on Parameter). Both
    // surface as NamedDecl entries but the initial is on the source structure.
    // For locals, find the matching LocalVar.
    const locals = t.pouLocals.get(d.scope) ?? [];
    for (const l of locals) {
        if (l.name.toLowerCase() === d.name.toLowerCase() && l.line === d.line) {
            return l.initial !== undefined && l.initial.trim() !== '';
        }
    }
    // Parameters: look up the POU and find the matching parameter.
    const p = t.pous.get(d.scope);
    if (p) {
        const all = [...p.inputs, ...p.outputs, ...p.inOuts];
        for (const param of all) {
            if (param.name.toLowerCase() === d.name.toLowerCase()) {
                return param.initial !== undefined && param.initial.trim() !== '';
            }
        }
    }
    return false;
}
function key(d) {
    return `${d.file}::${d.scope}::${d.name.toLowerCase()}`;
}
export const uninitializedVarUsed = {
    category: 'UNINITIALIZED_VAR_USED',
    defaultSeverity: 'warn',
    run(ctx) {
        const tracked = (t) => t.declarations
            .filter((d) => SEED_KINDS.has(d.kind))
            .map((d) => ({ decl: d, initialAtDecl: declHasInitialValue(d, t) }));
        const findings = [];
        const before = new Set();
        for (const { decl, initialAtDecl } of tracked(ctx.before)) {
            if (isUninitialisedRead(decl, initialAtDecl, ctx.before) !== null)
                before.add(key(decl));
        }
        for (const { decl, initialAtDecl } of tracked(ctx.after)) {
            const readLine = isUninitialisedRead(decl, initialAtDecl, ctx.after);
            if (readLine === null)
                continue;
            if (before.has(key(decl)))
                continue;
            findings.push({
                severity: 'warn',
                category: 'UNINITIALIZED_VAR_USED',
                file: decl.file,
                line: readLine,
                summary: `'${decl.name}' is read before any assignment (PLCopen CP3)`,
                detail: 'PLCopen CP3: every variable shall be initialised before it is used. Either give the declaration an initial value (`x : INT := 0;`) or assign to it before the first read. (This check is a source-position heuristic and does not model control-flow; conditional initialisations may produce false positives.)',
            });
        }
        return findings;
    },
};
//# sourceMappingURL=uninitialized-var-used.js.map