import type { AstFile, StNode } from './types.js';
/**
 * Override the per-file size cap used by `parseSource`. Called by the CLI
 * after the resolved config is known; tests can use it to exercise the cap
 * at smaller sizes.
 */
export declare function setMaxSourceLength(n: number): void;
export declare function parseSource(source: string, path: string): Promise<AstFile>;
export declare function parseFile(absPath: string, relPath: string): Promise<AstFile>;
/**
 * Synchronous parse helper used by tests that already hold a parsed root node.
 * Not for production paths.
 */
export declare function astFileFromRoot(path: string, source: string, root: StNode): AstFile;
//# sourceMappingURL=parse.d.ts.map