function isUnknownMember(ref, t) {
    const enumDef = t.enums.get(ref.leftText.trim());
    if (!enumDef)
        return false; // left side isn't a known enum, skip
    return !enumDef.values.some((v) => v.name.toLowerCase() === ref.rightText.trim().toLowerCase());
}
function key(ref) {
    return `${ref.file}::${ref.leftText}.${ref.rightText}::${ref.line}`;
}
export const enumMemberUnknown = {
    category: 'ENUM_MEMBER_UNKNOWN',
    defaultSeverity: 'error',
    run(ctx) {
        const findings = [];
        const beforeBad = new Set();
        for (const ref of ctx.before.memberAccesses) {
            if (isUnknownMember(ref, ctx.before))
                beforeBad.add(key(ref));
        }
        for (const ref of ctx.after.memberAccesses) {
            if (!isUnknownMember(ref, ctx.after))
                continue;
            if (beforeBad.has(key(ref)))
                continue; // already broken; don't re-flag
            const enumDef = ctx.after.enums.get(ref.leftText.trim());
            const candidates = enumDef.values.map((v) => v.name);
            findings.push({
                severity: 'error',
                category: 'ENUM_MEMBER_UNKNOWN',
                file: ref.file,
                line: ref.line,
                summary: `Unknown enum member ${ref.leftText}.${ref.rightText}`,
                detail: `Enum ${ref.leftText} has values: ${candidates.join(', ')}. Likely typo.`,
                related: [
                    { file: enumDef.file, line: enumDef.line, note: 'enum definition' },
                ],
            });
        }
        return findings;
    },
};
//# sourceMappingURL=enum-member-unknown.js.map