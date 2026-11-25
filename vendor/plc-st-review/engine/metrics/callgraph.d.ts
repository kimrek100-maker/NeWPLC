import type { SymbolTable } from '../types.js';
/**
 * POU-to-POU call graph derived from the symbol table. Nodes are the callable
 * top-level POUs (PROGRAM / FUNCTION / FUNCTION_BLOCK); METHODs and INTERFACEs
 * are not nodes, a call into a method resolves to its owning FB type. Self
 * recursion is excluded from edges (it is `RECURSIVE_CALL`'s job) but still
 * surfaces in `cycles` as a single-node loop is not reported.
 */
export interface CallGraph {
    nodes: string[];
    /** caller POU -> set of distinct callee POUs (self-edges excluded). */
    adjacency: Map<string, Set<string>>;
    fanIn: Map<string, number>;
    fanOut: Map<string, number>;
    /**
     * FUNCTION / FUNCTION_BLOCK POUs that nothing calls (PROGRAMs excluded). A
     * POU reached only through `EXTENDS` / `IMPLEMENTS` is NOT dead: it is used,
     * just not via a call site. Base classes and implemented FBs are therefore
     * excluded even though their call fan-in is zero.
     */
    deadPous: string[];
    /** Strongly-connected components with more than one POU (mutual recursion). */
    cycles: string[][];
    /** POU count along the longest call chain (A->B->C = 3). */
    dependencyDepth: number;
}
export declare function buildCallGraph(table: SymbolTable): CallGraph;
//# sourceMappingURL=callgraph.d.ts.map