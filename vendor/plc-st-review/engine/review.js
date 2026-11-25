import { allChecks } from './checks/index.js';
import { pairFiles } from './diff.js';
import { buildSymbolTable } from './symbols.js';
import { SEVERITY_RANK, } from './types.js';
export function runReview(input) {
    const pairs = pairFiles(input.beforeFiles, input.afterFiles);
    const cs = input.config.caseSensitive;
    const before = buildSymbolTable(input.beforeFiles, cs);
    const after = buildSymbolTable(input.afterFiles, cs);
    const project = input.projectFiles
        ? buildSymbolTable(input.projectFiles, cs)
        : undefined;
    const ctx = {
        config: input.config,
        pairs,
        before,
        after,
        project,
    };
    const findings = [];
    for (const check of allChecks()) {
        if (input.config.disabledChecks.has(check.category))
            continue;
        if (check.scope === 'project' && !ctx.project)
            continue;
        const raw = check.run(ctx);
        for (const f of raw) {
            const overridden = input.config.severityOverrides.get(check.category) ?? f.severity;
            findings.push({ ...f, severity: overridden });
        }
    }
    return sortFindings(findings);
}
export function sortFindings(findings) {
    return [...findings].sort((a, b) => {
        const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
        if (sev !== 0)
            return sev;
        const file = a.file.localeCompare(b.file);
        if (file !== 0)
            return file;
        if (a.line !== b.line)
            return a.line - b.line;
        return a.category.localeCompare(b.category);
    });
}
export function summary(findings) {
    const out = { error: 0, warn: 0, info: 0 };
    for (const f of findings)
        out[f.severity] += 1;
    return out;
}
export function shouldFail(findings, threshold) {
    const min = SEVERITY_RANK[threshold];
    return findings.some((f) => SEVERITY_RANK[f.severity] >= min);
}
//# sourceMappingURL=review.js.map