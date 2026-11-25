import { structuralFingerprint } from '../grammar.js';
export const commentOnly = {
    category: 'COMMENT_ONLY',
    defaultSeverity: 'info',
    run(ctx) {
        const findings = [];
        for (const pair of ctx.pairs) {
            if (!pair.before || !pair.after)
                continue;
            const beforeFp = structuralFingerprint(pair.before.root);
            const afterFp = structuralFingerprint(pair.after.root);
            if (beforeFp !== afterFp)
                continue;
            // Same structure; did the raw source differ? If not, nothing to say.
            if (pair.before.source === pair.after.source)
                continue;
            findings.push({
                severity: 'info',
                category: 'COMMENT_ONLY',
                file: pair.path,
                line: 1,
                summary: 'Only comments changed in this file',
                detail: 'AST structure is identical between revisions. Safe to merge unless comments themselves matter.',
            });
        }
        return findings;
    },
};
//# sourceMappingURL=comment-only.js.map