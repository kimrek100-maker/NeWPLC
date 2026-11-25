import { parseStNumber } from '../literals.js';
function key(a) {
    return `${a.file}::${a.scope}::${a.varName}`;
}
function isSingleElement(a) {
    const lo = parseStNumber(a.lower);
    const hi = parseStNumber(a.upper);
    return lo !== null && hi !== null && lo === hi;
}
export const arraySingleElement = {
    category: 'ARRAY_SINGLE_ELEMENT',
    defaultSeverity: 'info',
    run(ctx) {
        const findings = [];
        const before = new Set();
        for (const a of ctx.before.arrayDecls) {
            if (isSingleElement(a))
                before.add(key(a));
        }
        for (const a of ctx.after.arrayDecls) {
            if (!isSingleElement(a))
                continue;
            if (before.has(key(a)))
                continue;
            findings.push({
                severity: 'info',
                category: 'ARRAY_SINGLE_ELEMENT',
                file: a.file,
                line: a.line,
                summary: `Array ${a.varName} declared with a single element [${a.lower}..${a.upper}]`,
                detail: 'An array of length one is usually a mistake, either the bounds are wrong, or a scalar variable would be clearer.',
            });
        }
        return findings;
    },
};
//# sourceMappingURL=array-single-element.js.map