import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
function lint(code){const r=spawnSync(process.execPath,['tools/lint.mjs'],{input:JSON.stringify({code}),encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout)}
const sample=readFileSync('examples/Motor.st','utf8');
assert.equal(lint(sample).status,'static_checked');
assert.ok(lint('PROGRAM X VAR END_VAR IF THEN END_PROGRAM').findings.some(f=>f.category==='SYNTAX'));
const unsafe=lint('PROGRAM X VAR a : INT; END_VAR a := 1 / 0; END_PROGRAM');
assert.ok(unsafe.findings.some(f=>f.category==='DIVISION_BY_ZERO'));
console.log('PASS: parser, valid ST, malformed ST, division by zero');
