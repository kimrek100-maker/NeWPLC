import type { AstFile, ReviewContext } from '../types.js';
export interface PouMetrics {
    name: string;
    file: string;
    line: number;
    complexity: number;
    nestingDepth: number;
    loc: number;
    locTotal: number;
    commentRatio: number;
    statementCount: number;
    branchCount: number;
    returnCount: number;
}
/**
 * Compute per-POU metrics for one parsed file, keyed by **qualified** POU
 * name (`Namespace.FB_X`, or just `FB_X` outside a namespace). Keying by bare
 * name silently dropped one of two same-named POUs in different namespaces in
 * the same file (L15); keying by qualified name matches what `symbols.pous`
 * already does and lets the namespaced FBs both surface in `--metrics`.
 */
export declare function computeFileMetrics(file: AstFile): Map<string, PouMetrics>;
export interface PouMetricDelta {
    name: string;
    before: PouMetrics;
    after: PouMetrics;
}
/**
 * Yield every POU that exists in both revisions of a changed file, paired with
 * its before/after metrics. This is the unit the metric-regression checks
 * compare. POUs added or deleted in the PR are skipped (no pair to diff), as
 * are files present on only one side.
 */
export declare function matchedPouMetrics(ctx: ReviewContext): PouMetricDelta[];
//# sourceMappingURL=pou-metrics.d.ts.map