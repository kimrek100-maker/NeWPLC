import * as monaco from 'monaco-editor/editor/editor.api.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import { loader } from '@monaco-editor/react';
self.MonacoEnvironment={getWorker:()=>new EditorWorker()};
loader.config({monaco});
monaco.languages.register({id:'structured-text'});
const keywords=['PROGRAM','END_PROGRAM','FUNCTION','END_FUNCTION','FUNCTION_BLOCK','END_FUNCTION_BLOCK','VAR','VAR_INPUT','VAR_OUTPUT','VAR_IN_OUT','VAR_GLOBAL','END_VAR','IF','THEN','ELSE','ELSIF','END_IF','CASE','OF','END_CASE','FOR','TO','BY','DO','END_FOR','WHILE','END_WHILE','REPEAT','UNTIL','END_REPEAT','RETURN','AND','OR','XOR','NOT','MOD','TRUE','FALSE'];
monaco.languages.setMonarchTokensProvider('structured-text',{ignoreCase:true,keywords,tokenizer:{root:[[/\(\*/, 'comment','@comment'],[/\/\/.*$/,'comment'],[/'([^']|'')*'/,'string'],[/\b(?:BOOL|INT|DINT|UINT|UDINT|REAL|LREAL|TIME|STRING|WORD|DWORD)\b/,'type'],[/\b(?:T|TIME)#[\w.]+/,'number'],[/\d+(?:\.\d+)?/,'number'],[/[a-zA-Z_]\w*/,{cases:{'@keywords':'keyword','@default':'identifier'}}],[/[:=<>+*/\-]+/,'operator']],comment:[[/\*\)/,'comment','@pop'],[/./,'comment']]}});
monaco.languages.setLanguageConfiguration('structured-text',{comments:{lineComment:'//',blockComment:['(*','*)']},brackets:[['(',')'],['[',']']],autoClosingPairs:[{open:'(',close:')'},{open:"'",close:"'"}]});
monaco.languages.registerCompletionItemProvider('structured-text',{provideCompletionItems:(model,position)=>{
 const word=model.getWordUntilPosition(position); const range={startLineNumber:position.lineNumber,endLineNumber:position.lineNumber,startColumn:word.startColumn,endColumn:word.endColumn};
 return {suggestions:[...keywords,'BOOL','INT','DINT','REAL','TIME','TON','TOF','TP','R_TRIG','F_TRIG'].map(label=>({label,kind:monaco.languages.CompletionItemKind.Keyword,insertText:label,range,detail:'IEC generico: verificare disponibilità nel target'}))};
}});
monaco.editor.defineTheme('studio',{base:'vs-dark',inherit:true,rules:[{token:'keyword',foreground:'ba9cf5'},{token:'type',foreground:'77cabb'},{token:'number',foreground:'e5ba85'},{token:'comment',foreground:'6f9285'},{token:'string',foreground:'d3b18b'}],colors:{'editor.background':'#12171e','editorLineNumber.foreground':'#536071','editor.lineHighlightBackground':'#1b2430','editor.selectionBackground':'#294254','editorCursor.foreground':'#64dfad'}});
export {monaco};
