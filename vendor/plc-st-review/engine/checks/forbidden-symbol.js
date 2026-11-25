function matches(name, patterns) {
    for (const p of patterns) {
        if (p.startsWith('/') && p.endsWith('/')) {
            // Bare regex `/foo/`.
            try {
                const re = new RegExp(p.slice(1, -1));
                if (re.test(name))
                    return true;
            }
            catch {
                // ignore malformed regex
            }
        }
        else if (p.toLowerCase() === name.toLowerCase()) {
            return true;
        }
    }
    return false;
}
function key(ref) {
    return `${ref.file}::${ref.line}::${ref.name.toLowerCase()}`;
}
export const forbiddenSymbol = {
    category: 'FORBIDDEN_SYMBOL',
    defaultSeverity: 'error',
    run(ctx) {
        const patterns = ctx.config.forbiddenSymbols;
        if (!patterns || patterns.length === 0)
            return [];
        const findings = [];
        const beforeBad = new Set();
        for (const ref of ctx.before.varReferences) {
            if (matches(ref.name, patterns))
                beforeBad.add(key(ref));
        }
        const seen = new Set();
        for (const ref of ctx.after.varReferences) {
            if (!matches(ref.name, patterns))
                continue;
            const k = key(ref);
            if (beforeBad.has(k))
                continue;
            if (seen.has(k))
                continue;
            seen.add(k);
            findings.push({
                severity: 'error',
                category: 'FORBIDDEN_SYMBOL',
                file: ref.file,
                line: ref.line,
                summary: `Forbidden identifier '${ref.name}' is referenced`,
                detail: 'This identifier is on the repo-configured `forbidden_symbols` blocklist (often deprecated globals or banned vendor library names). Replace it with the approved alternative.',
            });
        }
        return findings;
    },
};
//# sourceMappingURL=forbidden-symbol.js.map