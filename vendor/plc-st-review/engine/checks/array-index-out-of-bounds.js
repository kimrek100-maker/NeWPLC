import { parseStNumber } from '../literals.js';
function findArrayDecl(name, decls) {
    for (const d of decls) {
        if (d.varName.toLowerCase() === name.toLowerCase())
            return d;
    }
    return null;
}
function isOOB(acc, decl) {
    if (acc.indexValue === null)
        return false;
    const lo = parseStNumber(decl.lower);
    const hi = parseStNumber(decl.upper);
    if (lo === null || hi === null)
        return false;
    return acc.indexValue < lo || acc.indexValue > hi;
}
function key(acc) {
    return `${acc.file}::${acc.scope}::${acc.arrayName}::${acc.indexText}::${acc.line}`;
}
export const arrayIndexOutOfBounds = {
    category: 'ARRAY_INDEX_OUT_OF_BOUNDS',
    defaultSeverity: 'error',
    run(ctx) {
        const findings = [];
        const beforeBad = new Set();
        for (const acc of ctx.before.arrayAccesses) {
            const decl = findArrayDecl(acc.arrayName, ctx.before.arrayDecls);
            if (decl && isOOB(acc, decl))
                beforeBad.add(key(acc));
        }
        for (const acc of ctx.after.arrayAccesses) {
            const decl = findArrayDecl(acc.arrayName, ctx.after.arrayDecls);
            if (!decl)
                continue;
            if (!isOOB(acc, decl))
                continue;
            if (beforeBad.has(key(acc)))
                continue;
            findings.push({
                severity: 'error',
                category: 'ARRAY_INDEX_OUT_OF_BOUNDS',
                file: acc.file,
                line: acc.line,
                summary: `${acc.arrayName}[${acc.indexText}] is out of declared bounds [${decl.lower}..${decl.upper}]`,
                detail: 'Only literal indices are checked; dynamic indices (variables) require flow analysis and are skipped.',
                related: [
                    { file: decl.file, line: decl.line, note: 'array declaration' },
                ],
            });
        }
        return findings;
    },
};
//# sourceMappingURL=array-index-out-of-bounds.js.map