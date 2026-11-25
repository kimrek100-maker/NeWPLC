import { descendantsOfAnyType, descendantsOfType, NODE } from '../grammar.js';
const CONDITIONAL_TYPES = new Set([
    NODE.IF_STATEMENT,
    NODE.ELSIF_CLAUSE,
    NODE.WHILE_STATEMENT,
    NODE.REPEAT_STATEMENT,
]);
function key(file, line) {
    return `${file}::${line}`;
}
function findInRoot(file, root) {
    const out = new Set();
    if (!root)
        return out;
    for (const cond of descendantsOfAnyType(root, CONDITIONAL_TYPES)) {
        // Case 1: the grammar happened to parse a real assignment_statement
        // inside the conditional. Only flag ones on the conditional's own line
        // (the condition expression), not ones in the body below.
        for (const asn of descendantsOfType(cond, NODE.ASSIGNMENT_STATEMENT)) {
            if (asn.startPosition.row === cond.startPosition.row) {
                out.add(key(file, cond.startPosition.row + 1));
            }
        }
        // Case 2: `IF x := y THEN` is not valid ST, `:=` is illegal in an
        // expression, so tree-sitter recovers by emitting an ERROR node
        // (e.g. `:= y`) rather than an assignment_statement. Detect that:
        // an ERROR descendant on the conditional's line whose text has `:=`.
        for (const err of descendantsOfType(cond, 'ERROR')) {
            if (err.startPosition.row === cond.startPosition.row &&
                err.text.includes(':=')) {
                out.add(key(file, cond.startPosition.row + 1));
            }
        }
    }
    return out;
}
export const assignmentInCondition = {
    category: 'ASSIGNMENT_IN_CONDITION',
    defaultSeverity: 'warn',
    run(ctx) {
        const findings = [];
        for (const pair of ctx.pairs) {
            const before = findInRoot(pair.path, pair.before?.root ?? null);
            const after = findInRoot(pair.path, pair.after?.root ?? null);
            for (const k of after) {
                if (before.has(k))
                    continue;
                const [file, lineStr] = k.split('::');
                findings.push({
                    severity: 'warn',
                    category: 'ASSIGNMENT_IN_CONDITION',
                    file,
                    line: Number.parseInt(lineStr, 10),
                    summary: 'Assignment (`:=`) used inside a conditional expression',
                    detail: 'IEC 61131-3 `IF x := y THEN` performs an assignment then tests the result. Almost always a typo for `IF x = y THEN`. Pull the assignment out above the condition.',
                });
            }
        }
        return findings;
    },
};
//# sourceMappingURL=assignment-in-condition.js.map