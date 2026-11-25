"""Bounded, fail-closed educational BOOL/INT scan interpreter. Never executes Python/ST binaries."""
import re
from lark import Lark, Transformer

GRAMMAR = r'''
start: "PROGRAM"i NAME "VAR"i decl* "END_VAR"i stmt* "END_PROGRAM"i
decl: NAME ":" type [":=" literal] ";"
type: "BOOL"i -> bool_type
    | "INT"i -> int_type
?stmt: NAME ":=" expr ";" -> assign
     | "IF"i expr "THEN"i stmt* ["ELSE"i stmt*] "END_IF"i ";" -> conditional
?expr: or_expr
?or_expr: and_expr ("OR"i and_expr)* -> or_expr
?and_expr: comparison ("AND"i comparison)* -> and_expr
?comparison: unary [COMP unary] -> comparison
?unary: "NOT"i unary -> negate
      | literal
      | NAME -> variable
      | "(" expr ")"
?literal: "TRUE"i -> true
        | "FALSE"i -> false
        | SIGNED_INT -> integer
COMP: "<>" | "<=" | ">=" | "=" | "<" | ">"
%import common.CNAME -> NAME
%import common.SIGNED_INT
%import common.WS
%ignore WS
%ignore /\(\*(?s:.*?)\*\)/
%ignore /\/\/[^\n]*/
'''
# Preserve ELSE as a separate grammar subtree to avoid inferring branch boundaries.
GRAMMAR = GRAMMAR.replace('stmt* ["ELSE"i stmt*]', 'branch [else_branch]').replace('?expr: or_expr', 'branch: stmt*\nelse_branch: "ELSE"i stmt*\n?expr: or_expr')
PARSER = Lark(GRAMMAR, parser='lalr', maybe_placeholders=False)

class Build(Transformer):
    def NAME(self, t): return str(t).upper()
    def bool_type(self, _): return 'BOOL'
    def int_type(self, _): return 'INT'
    def integer(self, x): return ('lit', int(x[0]))
    def true(self, _): return ('lit', True)
    def false(self, _): return ('lit', False)
    def variable(self, x): return ('var', x[0])
    def negate(self, x): return ('not', x[0])
    def and_expr(self, x): return x[0] if len(x)==1 else ('and', x)
    def or_expr(self, x): return x[0] if len(x)==1 else ('or', x)
    def comparison(self, x): return x[0] if len(x)==1 else ('cmp', str(x[1]), x[0], x[2])
    def decl(self, x): return ('decl', *x)
    def assign(self, x): return ('assign', *x)
    def branch(self, x): return x
    def else_branch(self, x): return x
    def conditional(self, x): return ('if', x[0], x[1], x[2] if len(x)>2 else [])
    def start(self, x): return x[1:]

def simulate(code, scenarios):
    if len(code)>30000 or len(scenarios)>100:
        raise ValueError('Limite simulatore: 30 kB e 100 scansioni')
    # No nested comments in this subset.
    if re.search(r'\(\*(?:(?!\*\)).)*\(\*', code, re.S):
        raise ValueError('Commenti annidati non supportati')
    try:
        tree = Build().transform(PARSER.parse(code))
    except Exception as e:
        raise ValueError('Sottoinsieme supportato: un PROGRAM, VAR BOOL/INT, assegnazioni, IF/ELSE, AND/OR/NOT e confronti. Timer, FB, cicli e aritmetica non simulati.') from e
    types, state, statements = {}, {}, []
    def check(name, value):
        if name not in types:
            raise ValueError(f'Variabile non dichiarata: {name}')
        if types[name]=='BOOL' and type(value) is not bool:
            raise ValueError(f'{name}: atteso BOOL')
        if types[name]=='INT' and (type(value) is not int or not -32768 <= value <= 32767):
            raise ValueError(f'{name}: atteso INT a 16 bit')
        return value
    def expr(e):
        op = e[0]
        if op=='lit': return e[1]
        if op=='var':
            if e[1] not in state: raise ValueError(f'Variabile non dichiarata: {e[1]}')
            return state[e[1]]
        if op in ('not','and','or'):
            values = [expr(e[1])] if op=='not' else [expr(a) for a in e[1]]
            if any(type(v) is not bool for v in values): raise ValueError('Operatore logico richiede BOOL')
            return not values[0] if op=='not' else all(values) if op=='and' else any(values)
        a,b = expr(e[2]),expr(e[3])
        if type(a) is not type(b): raise ValueError('Confronto fra tipi incompatibili')
        return {'=':lambda:a==b,'<>':lambda:a!=b,'<':lambda:a<b,'>':lambda:a>b,'<=':lambda:a<=b,'>=':lambda:a>=b}[e[1]]()
    for s in tree:
        if s[0]=='decl':
            _, name, kind, *initial = s
            if name in types: raise ValueError('Dichiarazione duplicata')
            types[name] = kind
            state[name] = check(name, expr(initial[0]) if initial else False if kind=='BOOL' else 0)
        else: statements.append(s)
    def execute(items):
        for s in items:
            if s[0]=='assign': state[s[1]] = check(s[1],expr(s[2]))
            else:
                value = expr(s[1])
                if type(value) is not bool: raise ValueError('IF richiede BOOL')
                execute(s[2] if value else s[3])
    results = []
    for i, case in enumerate(scenarios):
        for name,value in case.get('inputs',{}).items():
            key=name.upper(); state[key]=check(key,value)
        execute(statements)
        expected = {k.upper():v for k,v in case.get('expected',{}).items()}
        for name,value in expected.items(): check(name,value)
        results.append({'scan':i+1,'state':dict(state),'passed': all(state[k]==v for k,v in expected.items()) if expected else None})
    return {'status':'subset_simulated','scans':results,'message':'Simulazione didattica BOOL/INT, stato mantenuto fra scansioni. Non equivale al runtime Schneider né a certificazione safety.'}
