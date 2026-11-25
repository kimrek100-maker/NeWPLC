function isInfinite(w) {
    if (w.hasExit)
        return false;
    const cond = w.conditionText.toUpperCase().replace(/\s+/g, '');
    return cond === 'TRUE' || cond === '1';
}
function key(w) {
    return `${w.file}::${w.scope}::${w.line}`;
}
export const infiniteLoop = {
    category: 'INFINITE_LOOP',
    defaultSeverity: 'error',
    run(ctx) {
        const findings = [];
        const beforeBad = new Set();
        for (const w of ctx.before.whileLoops) {
            if (isInfinite(w))
                beforeBad.add(key(w));
        }
        for (const w of ctx.after.whileLoops) {
            if (!isInfinite(w))
                continue;
            if (beforeBad.has(key(w)))
                continue;
            findings.push({
                severity: 'error',
                category: 'INFINITE_LOOP',
                file: w.file,
                line: w.line,
                summary: 'WHILE TRUE loop with no EXIT statement',
                detail: 'On a PLC scan, an infinite loop blocks the rest of the program forever. Either add EXIT inside the body or convert to a state-driven structure.',
            });
        }
        return findings;
    },
};
//# sourceMappingURL=infinite-loop.js.map