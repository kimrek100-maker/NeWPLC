export const NODE = {
    SOURCE_FILE: 'source_file',
    PROGRAM: 'program_declaration',
    FUNCTION: 'function_declaration',
    FUNCTION_BLOCK: 'function_block_declaration',
    METHOD: 'method_declaration',
    METHOD_SIGNATURE: 'method_signature',
    INTERFACE: 'interface_declaration',
    NAMESPACE: 'namespace_declaration',
    TYPE_DECLARATION: 'type_declaration',
    TYPE_DEFINITION: 'type_definition',
    GLOBAL_VAR_BLOCK: 'global_var_declaration_block',
    VAR_BLOCK: 'var_block',
    VAR_INPUT: 'var_input',
    VAR_OUTPUT: 'var_output',
    VAR_IN_OUT: 'var_in_out',
    VAR_GLOBAL: 'var_global',
    VAR_TEMP: 'var_temp',
    VAR_EXTERNAL: 'var_external',
    VAR_QUALIFIER: 'var_qualifier',
    VAR_QUALIFIER_LIST: 'var_qualifier_list',
    VARIABLE_DECLARATION: 'variable_declaration',
    STRUCTURE_FIELD: 'structure_field',
    STRUCTURE_TYPE_INLINE: 'structure_type_inline',
    ENUM_TYPE_INLINE: 'enumerated_type_inline',
    ENUMERATOR: 'enumerator',
    ARRAY_TYPE: 'array_type',
    SUBRANGE_TYPE: 'subrange_type',
    SUBRANGE: 'subrange',
    ELEMENTARY_TYPE: 'elementary_type',
    GENERIC_TYPE: 'generic_type',
    POINTER_TYPE: 'pointer_type',
    REFERENCE_TYPE: 'reference_type',
    STRING_TYPE: 'string_type',
    IDENTIFIER: 'identifier',
    QUALIFIED_IDENTIFIER: 'qualified_identifier',
    CASE_STATEMENT: 'case_statement',
    CASE_CLAUSE: 'case_clause',
    CASE_VALUE: 'case_value',
    ELSE_CLAUSE: 'else_clause',
    IF_STATEMENT: 'if_statement',
    ELSIF_CLAUSE: 'elsif_clause',
    FOR_STATEMENT: 'for_statement',
    WHILE_STATEMENT: 'while_statement',
    REPEAT_STATEMENT: 'repeat_statement',
    RETURN_STATEMENT: 'return_statement',
    EXIT_STATEMENT: 'exit_statement',
    CONTINUE_STATEMENT: 'continue_statement',
    GOTO_STATEMENT: 'goto_statement',
    DIRECT_ADDRESS: 'direct_address',
    ASSIGNMENT_STATEMENT: 'assignment_statement',
    INVOCATION_STATEMENT: 'invocation_statement',
    CALL_EXPRESSION: 'call_expression',
    ARGUMENT_LIST: 'argument_list',
    NAMED_ARGUMENT: 'named_argument',
    MEMBER_ACCESS: 'member_access_expression',
    INDEX_EXPRESSION: 'index_expression',
    BINARY_EXPRESSION: 'binary_expression',
    UNARY_EXPRESSION: 'unary_expression',
    TIME_LITERAL: 'time_literal',
    INTEGER_LITERAL: 'integer_literal',
    REAL_LITERAL: 'real_literal',
    BOOLEAN_LITERAL: 'boolean_literal',
    STRING_LITERAL: 'string_literal',
    COMMENT: 'comment',
    PRAGMA: 'pragma',
    USING: 'using_directive',
    VAR_ACCESS: 'var_access',
};
export const VAR_SECTION_NODES = new Set([
    NODE.VAR_BLOCK,
    NODE.VAR_INPUT,
    NODE.VAR_OUTPUT,
    NODE.VAR_IN_OUT,
    NODE.VAR_GLOBAL,
    NODE.VAR_TEMP,
    NODE.VAR_EXTERNAL,
]);
export const POU_NODES = new Set([
    NODE.PROGRAM,
    NODE.FUNCTION,
    NODE.FUNCTION_BLOCK,
    NODE.METHOD,
    NODE.INTERFACE,
]);
export const TIMER_TYPE_NAMES = new Set(['TON', 'TOF', 'TP']);
export function childrenOf(node) {
    // Prefer the parser's `namedChildren` when available (the real tree-sitter
    // node exposes both, `children` includes anonymous tokens like `FOR`,
    // `:=`, `;`, which break positional indexing and pollute structural walks).
    // Test fixtures don't populate `namedChildren`, so we fall back to `children`
    // for them (the fixture builder only emits named-equivalent nodes anyway).
    if (node.namedChildren)
        return node.namedChildren;
    return node.children ?? [];
}
/** Returns ALL children including anonymous tokens. Rarely needed. */
export function allChildrenOf(node) {
    return node.children ?? [];
}
export function findChild(node, type) {
    for (const c of childrenOf(node)) {
        if (c.type === type)
            return c;
    }
    return null;
}
export function findChildren(node, type) {
    const out = [];
    for (const c of childrenOf(node)) {
        if (c.type === type)
            out.push(c);
    }
    return out;
}
export function descendantsOfType(node, type) {
    const out = [];
    const stack = [...childrenOf(node)];
    while (stack.length) {
        const n = stack.pop();
        if (n.type === type)
            out.push(n);
        for (const c of childrenOf(n))
            stack.push(c);
    }
    return out;
}
export function descendantsOfAnyType(node, types) {
    const out = [];
    const stack = [...childrenOf(node)];
    while (stack.length) {
        const n = stack.pop();
        if (types.has(n.type))
            out.push(n);
        for (const c of childrenOf(n))
            stack.push(c);
    }
    return out;
}
export function findIdentifierText(node) {
    for (const c of childrenOf(node)) {
        if (c.type === NODE.IDENTIFIER || c.type === NODE.QUALIFIED_IDENTIFIER) {
            return c.text;
        }
    }
    return null;
}
export function lineOf(node) {
    return node.startPosition.row + 1;
}
export function colOf(node) {
    return node.startPosition.column + 1;
}
export function nodeIsTrivia(type) {
    return type === NODE.COMMENT;
}
/**
 * Render a structural fingerprint of a subtree, ignoring comments and exact
 * whitespace. Two trees with the same fingerprint differ only in comments.
 */
export function structuralFingerprint(node) {
    const parts = [];
    walkForFingerprint(node, parts);
    return parts.join('');
}
function walkForFingerprint(node, out) {
    if (nodeIsTrivia(node.type))
        return;
    const kids = childrenOf(node);
    if (kids.length === 0) {
        out.push(`<${node.type}:${node.text}>`);
        return;
    }
    out.push(`(${node.type}`);
    for (const c of kids)
        walkForFingerprint(c, out);
    out.push(')');
}
//# sourceMappingURL=grammar.js.map