// ============================================================
// F-Lite Compiler - JavaScript Port
// Faithful port of the C++ implementation for browser use
// ============================================================

// --- Token Types ---
const TokenType = {
    INTEGER_LIT: 'INTEGER_LIT',
    STRING_LIT: 'STRING_LIT',
    IDENTIFIER: 'IDENTIFIER',
    KW_PROGRAM: 'KW_PROGRAM',
    KW_INTEGER: 'KW_INTEGER',
    KW_READ: 'KW_READ',
    KW_WRITE: 'KW_WRITE',
    KW_IF: 'KW_IF',
    KW_THEN: 'KW_THEN',
    KW_ELSE: 'KW_ELSE',
    KW_DO: 'KW_DO',
    KW_END: 'KW_END',
    KW_SUBROUTINE: 'KW_SUBROUTINE',
    KW_CALL: 'KW_CALL',
    KW_RETURN: 'KW_RETURN',
    KW_STOP: 'KW_STOP',
    OP_PLUS: 'OP_PLUS',
    OP_MINUS: 'OP_MINUS',
    OP_STAR: 'OP_STAR',
    OP_SLASH: 'OP_SLASH',
    OP_ASSIGN: 'OP_ASSIGN',
    OP_EQ: 'OP_EQ',
    OP_NE: 'OP_NE',
    OP_LT: 'OP_LT',
    OP_GT: 'OP_GT',
    OP_LE: 'OP_LE',
    OP_GE: 'OP_GE',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    COMMA: 'COMMA',
    COLON: 'COLON',
    NEWLINE: 'NEWLINE',
    END_OF_FILE: 'END_OF_FILE',
    UNKNOWN: 'UNKNOWN'
};

// Token category for coloring
function tokenCategory(type) {
    if (type.startsWith('KW_')) return 'keyword';
    if (type.startsWith('OP_')) return 'operator';
    if (type === TokenType.INTEGER_LIT) return 'number';
    if (type === TokenType.STRING_LIT) return 'string';
    if (type === TokenType.IDENTIFIER) return 'identifier';
    if (type === TokenType.LPAREN || type === TokenType.RPAREN ||
        type === TokenType.COMMA || type === TokenType.COLON) return 'delimiter';
    if (type === TokenType.NEWLINE || type === TokenType.END_OF_FILE) return 'special';
    return 'unknown';
}

const KEYWORD_MAP = {
    'PROGRAM': TokenType.KW_PROGRAM,
    'INTEGER': TokenType.KW_INTEGER,
    'READ': TokenType.KW_READ,
    'WRITE': TokenType.KW_WRITE,
    'IF': TokenType.KW_IF,
    'THEN': TokenType.KW_THEN,
    'ELSE': TokenType.KW_ELSE,
    'DO': TokenType.KW_DO,
    'END': TokenType.KW_END,
    'SUBROUTINE': TokenType.KW_SUBROUTINE,
    'CALL': TokenType.KW_CALL,
    'RETURN': TokenType.KW_RETURN,
    'STOP': TokenType.KW_STOP
};

const KEYWORDS = Object.keys(KEYWORD_MAP);

function lookupKeyword(id) {
    const upper = id.toUpperCase();
    return KEYWORD_MAP[upper] || TokenType.IDENTIFIER;
}

function tokenTypeName(t) {
    const names = {
        [TokenType.INTEGER_LIT]: 'INTEGER_LIT',
        [TokenType.STRING_LIT]: 'STRING_LIT',
        [TokenType.IDENTIFIER]: 'IDENTIFIER',
        [TokenType.KW_PROGRAM]: 'PROGRAM',
        [TokenType.KW_INTEGER]: 'INTEGER',
        [TokenType.KW_READ]: 'READ',
        [TokenType.KW_WRITE]: 'WRITE',
        [TokenType.KW_IF]: 'IF',
        [TokenType.KW_THEN]: 'THEN',
        [TokenType.KW_ELSE]: 'ELSE',
        [TokenType.KW_DO]: 'DO',
        [TokenType.KW_END]: 'END',
        [TokenType.KW_SUBROUTINE]: 'SUBROUTINE',
        [TokenType.KW_CALL]: 'CALL',
        [TokenType.KW_RETURN]: 'RETURN',
        [TokenType.KW_STOP]: 'STOP',
        [TokenType.OP_PLUS]: "'+'",
        [TokenType.OP_MINUS]: "'-'",
        [TokenType.OP_STAR]: "'*'",
        [TokenType.OP_SLASH]: "'/'",
        [TokenType.OP_ASSIGN]: "'='",
        [TokenType.OP_EQ]: "'.EQ.'",
        [TokenType.OP_NE]: "'.NE.'",
        [TokenType.OP_LT]: "'.LT.'",
        [TokenType.OP_GT]: "'.GT.'",
        [TokenType.OP_LE]: "'.LE.'",
        [TokenType.OP_GE]: "'.GE.'",
        [TokenType.LPAREN]: "'('",
        [TokenType.RPAREN]: "')'",
        [TokenType.COMMA]: "','",
        [TokenType.COLON]: "':'",
        [TokenType.NEWLINE]: 'NEWLINE',
        [TokenType.END_OF_FILE]: 'EOF',
        [TokenType.UNKNOWN]: 'UNKNOWN'
    };
    return names[t] || 'UNKNOWN';
}

function canonicalName(name) {
    let upper = name.toUpperCase();
    if (upper.length > 32) upper = upper.substring(0, 32);
    return upper;
}

// --- Token ---
class Token {
    constructor(type, lexeme, line, col) {
        this.type = type || TokenType.END_OF_FILE;
        this.lexeme = lexeme || '';
        this.line = line || 0;
        this.col = col || 0;
    }
}

// --- Scanner ---
class Scanner {
    constructor(source) {
        this.source = source;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        this.hasPeeked = false;
        this.peeked = null;
        this.lines = source.split('\n').map(l => l.replace(/\r$/, ''));
        this.allTokens = []; // collect all tokens for visualization
    }

    current() {
        if (this.pos >= this.source.length) return '\0';
        return this.source[this.pos];
    }

    peekChar() {
        if (this.pos + 1 >= this.source.length) return '\0';
        return this.source[this.pos + 1];
    }

    advance() {
        const c = this.source[this.pos];
        this.pos++;
        this.col++;
        return c;
    }

    atEnd() {
        return this.pos >= this.source.length;
    }

    skipWhitespace() {
        while (!this.atEnd()) {
            const c = this.current();
            if (c === ' ' || c === '\t' || c === '\r') {
                this.advance();
            } else break;
        }
    }

    skipComment() {
        while (!this.atEnd() && this.current() !== '\n') {
            this.advance();
        }
    }

    makeToken(type, lexeme, startCol) {
        return new Token(type, lexeme, this.line, startCol);
    }

    scanIdentifier() {
        const startCol = this.col;
        let lexeme = '';
        while (!this.atEnd() && (/[a-zA-Z0-9_]/).test(this.current())) {
            lexeme += this.advance();
        }
        const type = lookupKeyword(lexeme);
        return this.makeToken(type, lexeme, startCol);
    }

    scanNumber() {
        const startCol = this.col;
        let lexeme = '';
        while (!this.atEnd() && (/[0-9]/).test(this.current())) {
            lexeme += this.advance();
        }
        return this.makeToken(TokenType.INTEGER_LIT, lexeme, startCol);
    }

    scanString() {
        const startCol = this.col;
        this.advance(); // consume opening '
        let lexeme = '';
        let raw = "'";

        while (!this.atEnd() && this.current() !== '\n') {
            if (this.current() === '\\') {
                raw += this.advance();
                if (!this.atEnd()) {
                    const esc = this.advance();
                    raw += esc;
                    switch (esc) {
                        case 'n': lexeme += '\n'; break;
                        case 't': lexeme += '\t'; break;
                        case "'": lexeme += "'"; break;
                        case '\\': lexeme += '\\'; break;
                        default: lexeme += '\\' + esc; break;
                    }
                }
            } else if (this.current() === "'") {
                raw += this.advance();
                return new Token(TokenType.STRING_LIT, lexeme, this.line, startCol);
            } else {
                const c = this.advance();
                lexeme += c;
                raw += c;
            }
        }
        return this.makeToken(TokenType.UNKNOWN, raw, startCol);
    }

    scanDotOperator() {
        const startCol = this.col;
        if (this.pos + 3 < this.source.length) {
            const c1 = this.source[this.pos + 1].toUpperCase();
            const c2 = this.source[this.pos + 2].toUpperCase();
            const c3 = this.source[this.pos + 3];

            if (c3 === '.') {
                let type = null, lexeme = '';
                if (c1 === 'E' && c2 === 'Q') { type = TokenType.OP_EQ; lexeme = '.EQ.'; }
                else if (c1 === 'N' && c2 === 'E') { type = TokenType.OP_NE; lexeme = '.NE.'; }
                else if (c1 === 'L' && c2 === 'T') { type = TokenType.OP_LT; lexeme = '.LT.'; }
                else if (c1 === 'G' && c2 === 'T') { type = TokenType.OP_GT; lexeme = '.GT.'; }
                else if (c1 === 'L' && c2 === 'E') { type = TokenType.OP_LE; lexeme = '.LE.'; }
                else if (c1 === 'G' && c2 === 'E') { type = TokenType.OP_GE; lexeme = '.GE.'; }

                if (type) {
                    this.advance(); this.advance(); this.advance(); this.advance();
                    return this.makeToken(type, lexeme, startCol);
                }
            }
        }
        const lexeme = this.advance();
        return this.makeToken(TokenType.UNKNOWN, lexeme, startCol);
    }

    scanNext() {
        this.skipWhitespace();
        if (this.atEnd()) return this.makeToken(TokenType.END_OF_FILE, '', this.col);

        const c = this.current();
        const startCol = this.col;

        if (c === '\n') {
            this.advance();
            const tok = this.makeToken(TokenType.NEWLINE, '\\n', startCol);
            tok.line = this.line;
            this.line++;
            this.col = 1;
            return tok;
        }

        if (c === '!') {
            this.skipComment();
            return this.scanNext();
        }

        if (/[a-zA-Z_]/.test(c)) return this.scanIdentifier();
        if (/[0-9]/.test(c)) return this.scanNumber();
        if (c === "'") return this.scanString();
        if (c === '.') return this.scanDotOperator();

        this.advance();
        switch (c) {
            case '+': return this.makeToken(TokenType.OP_PLUS, '+', startCol);
            case '-': return this.makeToken(TokenType.OP_MINUS, '-', startCol);
            case '*': return this.makeToken(TokenType.OP_STAR, '*', startCol);
            case '(': return this.makeToken(TokenType.LPAREN, '(', startCol);
            case ')': return this.makeToken(TokenType.RPAREN, ')', startCol);
            case ',': return this.makeToken(TokenType.COMMA, ',', startCol);
            case ':': return this.makeToken(TokenType.COLON, ':', startCol);
            case '=':
                if (!this.atEnd() && this.current() === '=') { this.advance(); return this.makeToken(TokenType.OP_EQ, '==', startCol); }
                return this.makeToken(TokenType.OP_ASSIGN, '=', startCol);
            case '<':
                if (!this.atEnd() && this.current() === '=') { this.advance(); return this.makeToken(TokenType.OP_LE, '<=', startCol); }
                return this.makeToken(TokenType.OP_LT, '<', startCol);
            case '>':
                if (!this.atEnd() && this.current() === '=') { this.advance(); return this.makeToken(TokenType.OP_GE, '>=', startCol); }
                return this.makeToken(TokenType.OP_GT, '>', startCol);
            case '/':
                if (!this.atEnd() && this.current() === '=') { this.advance(); return this.makeToken(TokenType.OP_NE, '/=', startCol); }
                return this.makeToken(TokenType.OP_SLASH, '/', startCol);
            default:
                return this.makeToken(TokenType.UNKNOWN, c, startCol);
        }
    }

    nextToken() {
        if (this.hasPeeked) {
            this.hasPeeked = false;
            return this.peeked;
        }
        const tok = this.scanNext();
        this.allTokens.push(tok);
        return tok;
    }

    peekToken() {
        if (!this.hasPeeked) {
            this.peeked = this.scanNext();
            this.hasPeeked = true;
        }
        return this.peeked;
    }

    // Tokenize the entire source and return all tokens (for visualization)
    static tokenizeAll(source) {
        const scanner = new Scanner(source);
        const tokens = [];
        while (true) {
            const tok = scanner.nextToken();
            tokens.push(tok);
            if (tok.type === TokenType.END_OF_FILE) break;
        }
        return tokens;
    }
}

// --- NLP Engine ---
class NLPEngine {
    constructor() {
        this.bigramTable = {};
        this.initBigramTable();
    }

    initBigramTable() {
        this.bigramTable[TokenType.KW_PROGRAM] = 'a program name (identifier)';
        this.bigramTable[TokenType.KW_INTEGER] = 'a variable name or array declaration';
        this.bigramTable[TokenType.KW_READ] = "'(' followed by a variable list";
        this.bigramTable[TokenType.KW_WRITE] = "'(' followed by expressions or strings";
        this.bigramTable[TokenType.KW_IF] = "'(' followed by a condition";
        this.bigramTable[TokenType.KW_THEN] = 'a newline, then statement(s)';
        this.bigramTable[TokenType.KW_ELSE] = 'a newline, then statement(s)';
        this.bigramTable[TokenType.KW_DO] = "a loop variable (identifier) followed by '='";
        this.bigramTable[TokenType.KW_END] = "'PROGRAM', 'IF', 'DO', or 'SUBROUTINE'";
        this.bigramTable[TokenType.KW_SUBROUTINE] = 'a subroutine name (identifier)';
        this.bigramTable[TokenType.KW_CALL] = 'a subroutine name (identifier)';
        this.bigramTable[TokenType.KW_RETURN] = 'a newline';
        this.bigramTable[TokenType.KW_STOP] = 'a newline';
        this.bigramTable[TokenType.OP_ASSIGN] = 'an expression';
        this.bigramTable[TokenType.OP_PLUS] = 'an expression (operand)';
        this.bigramTable[TokenType.OP_MINUS] = 'an expression (operand)';
        this.bigramTable[TokenType.OP_STAR] = 'an expression (operand)';
        this.bigramTable[TokenType.OP_SLASH] = 'an expression (operand)';
        this.bigramTable[TokenType.LPAREN] = 'an expression or identifier';
        this.bigramTable[TokenType.RPAREN] = "an operator, ')', ',', or newline";
        this.bigramTable[TokenType.COMMA] = 'an expression or identifier';
        this.bigramTable[TokenType.IDENTIFIER] = "'=', '(', ',', an operator, or newline";
        this.bigramTable[TokenType.INTEGER_LIT] = "an operator, ')', ',', or newline";
        this.bigramTable[TokenType.OP_EQ] = 'an expression';
        this.bigramTable[TokenType.OP_NE] = 'an expression';
        this.bigramTable[TokenType.OP_LT] = 'an expression';
        this.bigramTable[TokenType.OP_GT] = 'an expression';
        this.bigramTable[TokenType.OP_LE] = 'an expression';
        this.bigramTable[TokenType.OP_GE] = 'an expression';
    }

    static levenshtein(a, b) {
        const m = a.length, n = b.length;
        if (m === 0) return n;
        if (n === 0) return m;

        let prev = Array.from({ length: n + 1 }, (_, j) => j);
        let curr = new Array(n + 1);

        for (let i = 1; i <= m; i++) {
            curr[0] = i;
            for (let j = 1; j <= n; j++) {
                const cost = a[i - 1].toUpperCase() === b[j - 1].toUpperCase() ? 0 : 1;
                curr[j] = Math.min(
                    prev[j] + 1,
                    curr[j - 1] + 1,
                    prev[j - 1] + cost
                );
            }
            [prev, curr] = [curr, prev];
        }
        return prev[n];
    }

    suggestKeyword(misspelled) {
        const upper = misspelled.toUpperCase();
        let bestDist = Infinity, bestKw = '';
        for (const kw of KEYWORDS) {
            const dist = NLPEngine.levenshtein(upper, kw);
            if (dist < bestDist) {
                bestDist = dist;
                bestKw = kw;
            }
        }
        return (bestDist <= 2 && bestDist > 0) ? bestKw : '';
    }

    expectedAfter(prevType) {
        return this.bigramTable[prevType] || '';
    }

    diagnose(found, expected, previous) {
        let msg = 'Error (line ' + found.line + '): expected ' + tokenTypeName(expected) +
                  ", but found '" + found.lexeme + "'";

        if (found.type === TokenType.IDENTIFIER || found.type === TokenType.UNKNOWN) {
            const suggestion = this.suggestKeyword(found.lexeme);
            if (suggestion) msg += " -- Did you mean '" + suggestion + "'?";
        }

        const hint = this.expectedAfter(previous.type);
        if (hint) {
            msg += '\n     Hint: after ' + tokenTypeName(previous.type) +
                   ', typically ' + hint + ' follows.';
        }
        return msg;
    }
}

// --- Symbol Table ---
class SymbolTable {
    constructor() {
        this.symbols = [];
        this.currentScope = 0;
    }

    declare(rawName, kind, arraySize, line) {
        const name = canonicalName(rawName);
        for (const sym of this.symbols) {
            if (sym.name === name && sym.scopeLevel === this.currentScope) return false;
        }
        this.symbols.push({ name, kind, arraySize, scopeLevel: this.currentScope, lineDeclared: line });
        return true;
    }

    lookup(rawName) {
        const name = canonicalName(rawName);
        for (let scope = this.currentScope; scope >= 0; scope--) {
            for (const sym of this.symbols) {
                if (sym.name === name && sym.scopeLevel === scope) return sym;
            }
        }
        return null;
    }

    enterScope() { this.currentScope++; }
    exitScope() {
        this.symbols = this.symbols.filter(s => s.scopeLevel !== this.currentScope);
        this.currentScope--;
    }
}

// --- TAC ---
const TACOp = {
    ADD: 'ADD', SUB: 'SUB', MUL: 'MUL', DIV: 'DIV',
    ASSIGN: 'ASSIGN',
    ARRAY_LOAD: 'ARRAY_LOAD', ARRAY_STORE: 'ARRAY_STORE',
    IF_EQ: 'IF_EQ', IF_NE: 'IF_NE', IF_LT: 'IF_LT',
    IF_GT: 'IF_GT', IF_LE: 'IF_LE', IF_GE: 'IF_GE',
    GOTO: 'GOTO', LABEL: 'LABEL',
    PARAM: 'PARAM', CALL: 'CALL', RETURN: 'RETURN',
    READ: 'READ', WRITE: 'WRITE', WRITE_STR: 'WRITE_STR',
    HALT: 'HALT'
};

// --- Parser ---
class Parser {
    constructor(scanner, nlp) {
        this.scanner = scanner;
        this.nlp = nlp;
        this.symtab = new SymbolTable();
        this.current = new Token();
        this.previous = new Token();
        this.errors = [];
        this.tacCode = [];
        this.tempCounter = 0;
        this.labelCounter = 0;
        this.hadError = false;
        this.advance();
    }

    advance() {
        this.previous = this.current;
        this.current = this.scanner.nextToken();
    }

    check(type) { return this.current.type === type; }

    match(type) {
        if (this.check(type)) { this.advance(); return true; }
        return false;
    }

    expect(type) {
        if (this.check(type)) { this.advance(); return; }
        this.errorAt(this.current, type);
    }

    expectNewline() {
        if (this.check(TokenType.NEWLINE)) { this.advance(); return; }
        if (this.check(TokenType.END_OF_FILE)) return;
        this.error("expected newline, but found '" + this.current.lexeme + "'");
        this.synchronize();
    }

    skipNewlines() {
        while (this.check(TokenType.NEWLINE)) this.advance();
    }

    synchronize() {
        while (!this.check(TokenType.NEWLINE) && !this.check(TokenType.END_OF_FILE)) {
            const t = this.current.type;
            if ([TokenType.KW_IF, TokenType.KW_DO, TokenType.KW_READ, TokenType.KW_WRITE,
                 TokenType.KW_INTEGER, TokenType.KW_END, TokenType.KW_CALL,
                 TokenType.KW_RETURN, TokenType.KW_STOP, TokenType.KW_ELSE].includes(t)) return;
            this.advance();
        }
        if (this.check(TokenType.NEWLINE)) this.advance();
    }

    error(msg) {
        this.hadError = true;
        this.errors.push({ line: this.current.line, message: msg });
    }

    errorAt(tok, expected) {
        this.hadError = true;
        const msg = this.nlp.diagnose(tok, expected, this.previous);
        this.errors.push({ line: tok.line, message: msg });
    }

    newTemp() { return 't' + (this.tempCounter++); }
    newLabel() { return 'L' + (this.labelCounter++); }

    emit(op, result, arg1, arg2) {
        this.tacCode.push({ op, result: result || '', arg1: arg1 || '', arg2: arg2 || '' });
    }

    parse() {
        this.skipNewlines();
        this.parseProgram();
        while (!this.check(TokenType.END_OF_FILE)) {
            this.skipNewlines();
            if (this.check(TokenType.KW_SUBROUTINE)) {
                this.parseSubroutine();
            } else if (this.check(TokenType.END_OF_FILE)) {
                break;
            } else {
                this.error("expected SUBROUTINE or end of file, but found '" + this.current.lexeme + "'");
                this.synchronize();
            }
        }
        return !this.hadError;
    }

    parseProgram() {
        this.expect(TokenType.KW_PROGRAM);
        if (this.check(TokenType.IDENTIFIER)) {
            this.symtab.declare(this.current.lexeme, 'PROGRAM', 0, this.current.line);
            this.advance();
        } else {
            this.error('expected program name after PROGRAM');
        }
        this.expectNewline();
        this.emit(TACOp.LABEL, 'PROGRAM_START');
        this.skipNewlines();
        this.parseBody();

        this.expect(TokenType.KW_END);
        this.match(TokenType.KW_PROGRAM);
        if (this.check(TokenType.IDENTIFIER)) this.advance();
        this.emit(TACOp.HALT, '');
        if (!this.check(TokenType.END_OF_FILE)) this.expectNewline();
    }

    parseSubroutine() {
        this.expect(TokenType.KW_SUBROUTINE);
        let subName = 'UNKNOWN_SUB';
        if (this.check(TokenType.IDENTIFIER)) {
            subName = this.current.lexeme;
            this.symtab.declare(subName, 'SUBROUTINE', 0, this.current.line);
            this.advance();
        } else {
            this.error('expected subroutine name after SUBROUTINE');
        }
        this.emit(TACOp.LABEL, canonicalName(subName));
        this.symtab.enterScope();

        this.expect(TokenType.LPAREN);
        if (!this.check(TokenType.RPAREN)) {
            do {
                if (this.check(TokenType.IDENTIFIER)) {
                    this.symtab.declare(this.current.lexeme, 'VARIABLE', 0, this.current.line);
                    this.advance();
                } else { this.error('expected parameter name'); break; }
            } while (this.match(TokenType.COMMA));
        }
        this.expect(TokenType.RPAREN);
        this.expectNewline();

        this.skipNewlines();
        this.parseBody();

        this.expect(TokenType.KW_END);
        this.match(TokenType.KW_SUBROUTINE);
        if (this.check(TokenType.IDENTIFIER)) this.advance();
        this.emit(TACOp.RETURN, '');
        this.symtab.exitScope();
        if (!this.check(TokenType.END_OF_FILE)) this.expectNewline();
    }

    parseBody() {
        while (true) {
            this.skipNewlines();
            if (this.check(TokenType.END_OF_FILE)) break;
            if (this.check(TokenType.KW_END)) break;
            if (this.check(TokenType.KW_ELSE)) break;

            if (this.check(TokenType.KW_INTEGER)) {
                this.parseDeclaration();
            } else {
                this.parseStatement();
            }
        }
    }

    parseDeclaration() {
        this.expect(TokenType.KW_INTEGER);
        do {
            if (this.check(TokenType.IDENTIFIER)) {
                const varName = this.current.lexeme;
                const line = this.current.line;
                this.advance();
                if (this.match(TokenType.LPAREN)) {
                    if (this.check(TokenType.INTEGER_LIT)) {
                        const size = parseInt(this.current.lexeme);
                        this.advance();
                        if (!this.symtab.declare(varName, 'ARRAY', size, line))
                            this.error("redeclaration of '" + varName + "'");
                    } else {
                        this.error('expected array size (integer literal)');
                    }
                    this.expect(TokenType.RPAREN);
                } else {
                    if (!this.symtab.declare(varName, 'VARIABLE', 0, line))
                        this.error("redeclaration of '" + varName + "'");
                }
            } else {
                this.error('expected variable name in declaration');
                this.synchronize();
                return;
            }
        } while (this.match(TokenType.COMMA));
        this.expectNewline();
    }

    parseStatement() {
        if (this.check(TokenType.IDENTIFIER)) {
            const peeked = this.scanner.peekToken();
            if (peeked.type !== TokenType.OP_ASSIGN && peeked.type !== TokenType.LPAREN) {
                const suggestion = this.nlp.suggestKeyword(this.current.lexeme);
                if (suggestion) {
                    this.error("unknown keyword '" + this.current.lexeme + "' -- Did you mean '" + suggestion + "'?");
                    this.synchronize();
                    return;
                }
            }
            const idName = this.current.lexeme;
            this.advance();
            this.parseAssignment(idName);
        } else if (this.check(TokenType.KW_READ)) { this.parseReadStmt(); }
        else if (this.check(TokenType.KW_WRITE)) { this.parseWriteStmt(); }
        else if (this.check(TokenType.KW_IF)) { this.parseIfStmt(); }
        else if (this.check(TokenType.KW_DO)) { this.parseDoStmt(); }
        else if (this.check(TokenType.KW_CALL)) { this.parseCallStmt(); }
        else if (this.check(TokenType.KW_RETURN)) { this.parseReturnStmt(); }
        else if (this.check(TokenType.KW_STOP)) { this.parseStopStmt(); }
        else {
            this.error("unexpected token '" + this.current.lexeme + "' at start of statement");
            const suggestion = this.nlp.suggestKeyword(this.current.lexeme);
            if (suggestion) this.errors[this.errors.length - 1].message += " -- Did you mean '" + suggestion + "'?";
            this.synchronize();
        }
    }

    parseAssignment(idName) {
        const canon = canonicalName(idName);
        if (this.match(TokenType.LPAREN)) {
            const index = this.parseExpression();
            this.expect(TokenType.RPAREN);
            this.expect(TokenType.OP_ASSIGN);
            const value = this.parseExpression();
            this.emit(TACOp.ARRAY_STORE, value, canon, index);
        } else {
            this.expect(TokenType.OP_ASSIGN);
            const value = this.parseExpression();
            this.emit(TACOp.ASSIGN, canon, value);
        }
        this.expectNewline();
    }

    parseReadStmt() {
        this.expect(TokenType.KW_READ);
        this.expect(TokenType.LPAREN);
        do {
            if (this.check(TokenType.IDENTIFIER)) {
                const varName = canonicalName(this.current.lexeme);
                this.advance();
                if (this.match(TokenType.LPAREN)) {
                    const index = this.parseExpression();
                    this.expect(TokenType.RPAREN);
                    const temp = this.newTemp();
                    this.emit(TACOp.READ, temp);
                    this.emit(TACOp.ARRAY_STORE, temp, varName, index);
                } else {
                    this.emit(TACOp.READ, varName);
                }
            } else { this.error('expected variable name in READ'); break; }
        } while (this.match(TokenType.COMMA));
        this.expect(TokenType.RPAREN);
        this.expectNewline();
    }

    parseWriteStmt() {
        this.expect(TokenType.KW_WRITE);
        this.expect(TokenType.LPAREN);
        do {
            if (this.check(TokenType.STRING_LIT)) {
                this.emit(TACOp.WRITE_STR, this.current.lexeme);
                this.advance();
            } else {
                const val = this.parseExpression();
                this.emit(TACOp.WRITE, val);
            }
        } while (this.match(TokenType.COMMA));
        this.expect(TokenType.RPAREN);
        this.expectNewline();
    }

    parseIfStmt() {
        this.expect(TokenType.KW_IF);
        this.expect(TokenType.LPAREN);
        const lhs = this.parseExpression();
        const relop = this.parseRelop();
        const rhs = this.parseExpression();
        this.expect(TokenType.RPAREN);
        this.expect(TokenType.KW_THEN);
        this.expectNewline();

        const elseLabel = this.newLabel();
        const endLabel = this.newLabel();

        const negMap = { EQ: TACOp.IF_NE, NE: TACOp.IF_EQ, LT: TACOp.IF_GE, GT: TACOp.IF_LE, LE: TACOp.IF_GT, GE: TACOp.IF_LT };
        this.emit(negMap[relop] || TACOp.IF_NE, elseLabel, lhs, rhs);

        this.skipNewlines();
        this.parseBody();

        if (this.check(TokenType.KW_ELSE)) {
            this.advance();
            this.expectNewline();
            this.emit(TACOp.GOTO, endLabel);
            this.emit(TACOp.LABEL, elseLabel);
            this.skipNewlines();
            this.parseBody();
            this.emit(TACOp.LABEL, endLabel);
        } else {
            this.emit(TACOp.LABEL, elseLabel);
        }

        this.expect(TokenType.KW_END);
        this.expect(TokenType.KW_IF);
        this.expectNewline();
    }

    parseDoStmt() {
        this.expect(TokenType.KW_DO);
        if (!this.check(TokenType.IDENTIFIER)) { this.error('expected loop variable after DO'); this.synchronize(); return; }
        const loopVar = canonicalName(this.current.lexeme);
        this.advance();
        this.expect(TokenType.OP_ASSIGN);
        const startVal = this.parseExpression();
        this.expect(TokenType.COMMA);
        const endVal = this.parseExpression();
        let stepVal = '1';
        if (this.match(TokenType.COMMA)) stepVal = this.parseExpression();
        this.expectNewline();

        const loopStart = this.newLabel();
        const loopEnd = this.newLabel();

        this.emit(TACOp.ASSIGN, loopVar, startVal);
        this.emit(TACOp.LABEL, loopStart);
        this.emit(TACOp.IF_GT, loopEnd, loopVar, endVal);

        this.skipNewlines();
        this.parseBody();

        const nextVal = this.newTemp();
        this.emit(TACOp.ADD, nextVal, loopVar, stepVal);
        this.emit(TACOp.ASSIGN, loopVar, nextVal);
        this.emit(TACOp.GOTO, loopStart);
        this.emit(TACOp.LABEL, loopEnd);

        this.expect(TokenType.KW_END);
        this.expect(TokenType.KW_DO);
        this.expectNewline();
    }

    parseCallStmt() {
        this.expect(TokenType.KW_CALL);
        if (!this.check(TokenType.IDENTIFIER)) { this.error('expected subroutine name after CALL'); this.synchronize(); return; }
        const subName = canonicalName(this.current.lexeme);
        this.advance();
        this.expect(TokenType.LPAREN);
        let paramCount = 0;
        if (!this.check(TokenType.RPAREN)) {
            do {
                const arg = this.parseExpression();
                this.emit(TACOp.PARAM, arg);
                paramCount++;
            } while (this.match(TokenType.COMMA));
        }
        this.expect(TokenType.RPAREN);
        this.emit(TACOp.CALL, subName, String(paramCount));
        this.expectNewline();
    }

    parseReturnStmt() {
        this.expect(TokenType.KW_RETURN);
        this.emit(TACOp.RETURN, '');
        this.expectNewline();
    }

    parseStopStmt() {
        this.expect(TokenType.KW_STOP);
        this.emit(TACOp.HALT, '');
        this.expectNewline();
    }

    parseExpression() {
        let left = this.parseTerm();
        while (this.check(TokenType.OP_PLUS) || this.check(TokenType.OP_MINUS)) {
            const op = this.check(TokenType.OP_PLUS) ? TACOp.ADD : TACOp.SUB;
            this.advance();
            const right = this.parseTerm();
            const temp = this.newTemp();
            this.emit(op, temp, left, right);
            left = temp;
        }
        return left;
    }

    parseTerm() {
        let left = this.parseFactor();
        while (this.check(TokenType.OP_STAR) || this.check(TokenType.OP_SLASH)) {
            const op = this.check(TokenType.OP_STAR) ? TACOp.MUL : TACOp.DIV;
            this.advance();
            const right = this.parseFactor();
            const temp = this.newTemp();
            this.emit(op, temp, left, right);
            left = temp;
        }
        return left;
    }

    parseFactor() {
        if (this.check(TokenType.OP_MINUS)) {
            this.advance();
            const operand = this.parseFactor();
            const temp = this.newTemp();
            this.emit(TACOp.SUB, temp, '0', operand);
            return temp;
        }
        if (this.check(TokenType.OP_PLUS)) { this.advance(); return this.parseFactor(); }

        if (this.match(TokenType.LPAREN)) {
            const result = this.parseExpression();
            this.expect(TokenType.RPAREN);
            return result;
        }

        if (this.check(TokenType.INTEGER_LIT)) {
            const val = this.current.lexeme;
            this.advance();
            return val;
        }

        if (this.check(TokenType.IDENTIFIER)) {
            const name = canonicalName(this.current.lexeme);
            this.advance();
            if (this.match(TokenType.LPAREN)) {
                const index = this.parseExpression();
                this.expect(TokenType.RPAREN);
                const temp = this.newTemp();
                this.emit(TACOp.ARRAY_LOAD, temp, name, index);
                return temp;
            }
            return name;
        }

        this.error("expected expression, but found '" + this.current.lexeme + "'");
        const suggestion = this.nlp.suggestKeyword(this.current.lexeme);
        if (suggestion) this.errors[this.errors.length - 1].message += " -- Did you mean '" + suggestion + "'?";
        this.advance();
        return '0';
    }

    parseRelop() {
        const map = {
            [TokenType.OP_EQ]: 'EQ', [TokenType.OP_NE]: 'NE',
            [TokenType.OP_LT]: 'LT', [TokenType.OP_GT]: 'GT',
            [TokenType.OP_LE]: 'LE', [TokenType.OP_GE]: 'GE'
        };
        const op = map[this.current.type];
        if (op) { this.advance(); return op; }
        this.error('expected relational operator (.EQ., .NE., .LT., .GT., .LE., .GE.)');
        return 'EQ';
    }
}

// --- Target Code Generator ---
class TargetCodeGen {
    generate(tac) {
        const asm = ['; F-Lite Target Assembly', '; Generated by F-Lite Compiler', ''];
        for (const instr of tac) {
            switch (instr.op) {
                case TACOp.ADD:
                    asm.push('    LOAD  R1, ' + instr.arg1, '    LOAD  R2, ' + instr.arg2,
                             '    ADD   R3, R1, R2', '    STORE ' + instr.result + ', R3'); break;
                case TACOp.SUB:
                    asm.push('    LOAD  R1, ' + instr.arg1, '    LOAD  R2, ' + instr.arg2,
                             '    SUB   R3, R1, R2', '    STORE ' + instr.result + ', R3'); break;
                case TACOp.MUL:
                    asm.push('    LOAD  R1, ' + instr.arg1, '    LOAD  R2, ' + instr.arg2,
                             '    MUL   R3, R1, R2', '    STORE ' + instr.result + ', R3'); break;
                case TACOp.DIV:
                    asm.push('    LOAD  R1, ' + instr.arg1, '    LOAD  R2, ' + instr.arg2,
                             '    DIV   R3, R1, R2', '    STORE ' + instr.result + ', R3'); break;
                case TACOp.ASSIGN:
                    asm.push('    LOAD  R1, ' + instr.arg1, '    STORE ' + instr.result + ', R1'); break;
                case TACOp.ARRAY_LOAD:
                    asm.push('    LOAD    R1, ' + instr.arg2, '    LOADARR R2, ' + instr.arg1 + ', R1',
                             '    STORE   ' + instr.result + ', R2'); break;
                case TACOp.ARRAY_STORE:
                    asm.push('    LOAD     R1, ' + instr.arg2, '    LOAD     R2, ' + instr.result,
                             '    STOREARR ' + instr.arg1 + ', R1, R2'); break;
                case TACOp.IF_EQ: case TACOp.IF_NE: case TACOp.IF_LT:
                case TACOp.IF_GT: case TACOp.IF_LE: case TACOp.IF_GE: {
                    const jmpMap = { IF_EQ:'JEQ', IF_NE:'JNE', IF_LT:'JLT', IF_GT:'JGT', IF_LE:'JLE', IF_GE:'JGE' };
                    asm.push('    LOAD  R1, ' + instr.arg1, '    LOAD  R2, ' + instr.arg2,
                             '    CMP   R1, R2', '    ' + jmpMap[instr.op] + '   ' + instr.result);
                    break;
                }
                case TACOp.GOTO: asm.push('    JMP   ' + instr.result); break;
                case TACOp.LABEL: asm.push(instr.result + ':'); break;
                case TACOp.PARAM: asm.push('    LOAD  R1, ' + instr.result, '    PUSH  R1'); break;
                case TACOp.CALL: asm.push('    CALL  ' + instr.result); break;
                case TACOp.RETURN: asm.push('    RET'); break;
                case TACOp.READ: asm.push('    READ  R1', '    STORE ' + instr.result + ', R1'); break;
                case TACOp.WRITE: asm.push('    LOAD  R1, ' + instr.result, '    WRITE R1'); break;
                case TACOp.WRITE_STR: asm.push('    WRITES "' + instr.result + '"'); break;
                case TACOp.HALT: asm.push('    HALT'); break;
            }
        }
        return asm;
    }
}

// --- Main compile function ---
function compile(source) {
    const scanner = new Scanner(source);
    const nlp = new NLPEngine();
    const parser = new Parser(scanner, nlp);
    const success = parser.parse();

    let assembly = [];
    if (success) {
        const codegen = new TargetCodeGen();
        assembly = codegen.generate(parser.tacCode);
    }

    // Get all tokens by re-scanning (the parser consumed the first scan)
    const tokens = Scanner.tokenizeAll(source);

    return {
        tokens: tokens,
        errors: parser.errors,
        tac: parser.tacCode,
        assembly: assembly,
        success: success,
        sourceLines: source.split('\n').map(l => l.replace(/\r$/, ''))
    };
}

// --- TAC formatting helper ---
function formatTAC(instr) {
    switch (instr.op) {
        case TACOp.ADD: return instr.result + ' = ' + instr.arg1 + ' + ' + instr.arg2;
        case TACOp.SUB: return instr.result + ' = ' + instr.arg1 + ' - ' + instr.arg2;
        case TACOp.MUL: return instr.result + ' = ' + instr.arg1 + ' * ' + instr.arg2;
        case TACOp.DIV: return instr.result + ' = ' + instr.arg1 + ' / ' + instr.arg2;
        case TACOp.ASSIGN: return instr.result + ' = ' + instr.arg1;
        case TACOp.ARRAY_LOAD: return instr.result + ' = ' + instr.arg1 + '[' + instr.arg2 + ']';
        case TACOp.ARRAY_STORE: return instr.arg1 + '[' + instr.arg2 + '] = ' + instr.result;
        case TACOp.IF_EQ: return 'if ' + instr.arg1 + ' == ' + instr.arg2 + ' goto ' + instr.result;
        case TACOp.IF_NE: return 'if ' + instr.arg1 + ' != ' + instr.arg2 + ' goto ' + instr.result;
        case TACOp.IF_LT: return 'if ' + instr.arg1 + ' < ' + instr.arg2 + ' goto ' + instr.result;
        case TACOp.IF_GT: return 'if ' + instr.arg1 + ' > ' + instr.arg2 + ' goto ' + instr.result;
        case TACOp.IF_LE: return 'if ' + instr.arg1 + ' <= ' + instr.arg2 + ' goto ' + instr.result;
        case TACOp.IF_GE: return 'if ' + instr.arg1 + ' >= ' + instr.arg2 + ' goto ' + instr.result;
        case TACOp.GOTO: return 'goto ' + instr.result;
        case TACOp.LABEL: return instr.result + ':';
        case TACOp.PARAM: return 'param ' + instr.result;
        case TACOp.CALL: return 'call ' + instr.result + ', ' + instr.arg1;
        case TACOp.RETURN: return 'return';
        case TACOp.READ: return 'read ' + instr.result;
        case TACOp.WRITE: return 'write ' + instr.result;
        case TACOp.WRITE_STR: return 'write "' + instr.result + '"';
        case TACOp.HALT: return 'halt';
        default: return '???';
    }
}
