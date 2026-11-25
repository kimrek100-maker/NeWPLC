import { parseSource } from '../vendor/plc-st-review/engine/parse.js';
import { runReview } from '../vendor/plc-st-review/engine/review.js';
import { buildSymbolTable } from '../vendor/plc-st-review/engine/symbols.js';
import { resolveConfig } from '../vendor/plc-st-review/config.js';
let input = '';
for await (const chunk of process.stdin) input += chunk;
try {
  const {code} = JSON.parse(input);
  if (!code?.trim() || code.length > 200000) throw Error('Sorgente vuoto o troppo grande');
  const ast = await parseSource(code, 'Main.st');
  const findings = runReview({beforeFiles: [], afterFiles: [ast], config: resolveConfig({}), projectFiles: [ast]});
  function walk(node) {
    if (node.type === 'ERROR' || node.isMissing) findings.push({severity:'error', category:'SYNTAX', line:node.startPosition.row+1, column:node.startPosition.column+1, summary:'Sintassi non riconosciuta dal parser IEC generico'});
    for (const child of node.children || []) walk(child);
  }
  walk(ast.root);
  const symbols=buildSymbolTable([ast]);
  const variables=symbols.declarations.filter(d=>d.typeText).map(d=>({name:d.name,type:d.typeText,scope:d.scope,kind:d.kind,line:d.line,assigned:symbols.assignmentTargets.some(a=>a.scope===d.scope&&a.name.toUpperCase()===d.name.toUpperCase())}));
  console.log(JSON.stringify({variables,status:findings.some(f=>f.severity==='error')?'issues':'static_checked', findings}));
} catch(e) { console.error(e.message); process.exitCode=1; }
