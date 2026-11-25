import { buildSymbolTable } from '../symbols.js';
import { aggregateMetrics } from './aggregate.js';
import { buildCallGraph } from './callgraph.js';
import { computeFileMetrics } from './pou-metrics.js';
const TOP_LEVEL = new Set(['program', 'function', 'function_block']);
/** Compute the full metrics report for a parsed project. */
export function runMetrics(files, thresholds) {
    const table = buildSymbolTable(files);
    const graph = buildCallGraph(table);
    const astByName = new Map();
    for (const f of files) {
        for (const [name, m] of computeFileMetrics(f))
            astByName.set(name, m);
    }
    const perPou = [];
    for (const p of table.pous.values()) {
        if (!TOP_LEVEL.has(p.kind))
            continue;
        const ast = astByName.get(p.qualifiedName);
        if (!ast)
            continue;
        const variableCount = (table.pouLocals.get(p.qualifiedName)?.length ?? 0) +
            p.inputs.length +
            p.outputs.length +
            p.inOuts.length;
        const fanIn = graph.fanIn.get(p.name) ?? 0;
        const fanOut = graph.fanOut.get(p.name) ?? 0;
        perPou.push({
            ...ast,
            kind: p.kind,
            inputCount: p.inputs.length,
            outputCount: p.outputs.length,
            variableCount,
            methodCount: countMethods(table, p.qualifiedName),
            fanIn,
            fanOut,
            thresholdStatus: statusFor(ast, fanOut, thresholds),
        });
    }
    perPou.sort((a, b) => a.name.localeCompare(b.name));
    return { perPou, aggregate: aggregateMetrics(table, graph, perPou), graph };
}
function countMethods(table, ownerName) {
    let n = 0;
    for (const p of table.pous.values()) {
        if (p.kind === 'method' && p.parent === ownerName)
            n += 1;
    }
    return n;
}
function statusFor(m, fanOut, t) {
    const bands = [
        [m.complexity, t.cyclomaticComplexity.warn, t.cyclomaticComplexity.error],
        [m.nestingDepth, t.nestingDepth.warn, t.nestingDepth.error],
        [m.loc, t.linesOfCode.warn, t.linesOfCode.error],
        [fanOut, t.fanOut.warn, t.fanOut.error],
    ];
    // Status reflects the "bigger is worse" metrics only. Comment ratio is a
    // "below" signal of a different character; folding it in would paint nearly
    // every uncommented POU yellow and drown out the real outliers.
    let status = 'ok';
    for (const [value, warn, error] of bands) {
        if (value >= error)
            return 'error';
        if (value >= warn)
            status = 'warn';
    }
    return status;
}
//# sourceMappingURL=index.js.map