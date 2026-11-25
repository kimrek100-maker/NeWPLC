import type { AstFile, FilePair, Parameter } from './types.js';
export declare function pairFiles(beforeFiles: AstFile[], afterFiles: AstFile[]): FilePair[];
export declare function signatureKey(params: readonly Parameter[]): string;
export declare function paramByName(params: readonly Parameter[], name: string): Parameter | undefined;
export declare function normalizeType(typeText: string): string;
export declare function normalizeTimeLiteral(text: string): number | null;
export interface ParamDelta {
    added: Parameter[];
    removed: Parameter[];
    typeChanged: Array<{
        name: string;
        before: Parameter;
        after: Parameter;
    }>;
    initialChanged: Array<{
        name: string;
        before: Parameter;
        after: Parameter;
    }>;
}
export declare function diffParams(before: readonly Parameter[], after: readonly Parameter[]): ParamDelta;
//# sourceMappingURL=diff.d.ts.map