import type { StNode } from '../types.js';
export interface LocMetrics {
    /** Non-blank, non-comment-only lines in the POU span. */
    loc: number;
    /** Total lines in the POU span, including blanks and comments. */
    total: number;
    /** (lines touched by a comment / total) * 100. */
    commentRatio: number;
}
/**
 * Line metrics for a POU. Comment text is blanked out of the source before
 * counting, so a line carrying only a comment is excluded from `loc` while a
 * line with code plus a trailing comment still counts. Works off the AST's
 * comment nodes, so it follows whatever the grammar treats as a comment.
 */
export declare function locMetrics(pou: StNode, source: string): LocMetrics;
//# sourceMappingURL=loc.d.ts.map