import type { AstFile, MetricsThresholds } from '../types.js';
import { type AggregateMetrics } from './aggregate.js';
import { type CallGraph } from './callgraph.js';
import { type PouMetrics } from './pou-metrics.js';
export type { CallGraph } from './callgraph.js';
export type { AggregateMetrics } from './aggregate.js';
export type { PouMetrics } from './pou-metrics.js';
export type ThresholdStatus = 'ok' | 'warn' | 'error';
/** Full per-POU report: AST metrics + symbol-table counts + call-graph fans. */
export interface PouReport extends PouMetrics {
    kind: string;
    inputCount: number;
    outputCount: number;
    variableCount: number;
    methodCount: number;
    fanIn: number;
    fanOut: number;
    thresholdStatus: ThresholdStatus;
}
export interface MetricsResult {
    perPou: PouReport[];
    aggregate: AggregateMetrics;
    graph: CallGraph;
}
/** Compute the full metrics report for a parsed project. */
export declare function runMetrics(files: AstFile[], thresholds: MetricsThresholds): MetricsResult;
//# sourceMappingURL=index.d.ts.map