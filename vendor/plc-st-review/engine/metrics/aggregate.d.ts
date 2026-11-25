import type { SymbolTable } from '../types.js';
import type { CallGraph } from './callgraph.js';
export interface AggregateMetrics {
    totalPous: number;
    totalLoc: number;
    totalTypes: number;
    totalGlobals: number;
    avgComplexity: number;
    avgNesting: number;
    deadPous: string[];
    orphanTypes: string[];
    dependencyDepth: number;
    cycles: string[][];
    docCoverage: number;
}
/** Per-POU inputs the aggregate needs; a subset of the full per-POU report. */
export interface PouMetricSummary {
    complexity: number;
    nestingDepth: number;
    loc: number;
}
export declare function aggregateMetrics(table: SymbolTable, graph: CallGraph, perPou: readonly PouMetricSummary[]): AggregateMetrics;
//# sourceMappingURL=aggregate.d.ts.map