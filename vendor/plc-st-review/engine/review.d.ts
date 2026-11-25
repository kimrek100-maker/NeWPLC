import { type AstFile, type Finding, type ResolvedConfig } from './types.js';
export interface ReviewInput {
    beforeFiles: AstFile[];
    afterFiles: AstFile[];
    config: ResolvedConfig;
    /**
     * Whole-repo files at the head revision. When present, `scope: 'project'`
     * checks (e.g. DEAD_POU_INTRODUCED) run against the resulting symbol table;
     * when absent, they are skipped.
     */
    projectFiles?: AstFile[];
}
export declare function runReview(input: ReviewInput): Finding[];
export declare function sortFindings(findings: Finding[]): Finding[];
export declare function summary(findings: Finding[]): {
    error: number;
    warn: number;
    info: number;
};
export declare function shouldFail(findings: Finding[], threshold: ResolvedConfig['failOnSeverity']): boolean;
//# sourceMappingURL=review.d.ts.map