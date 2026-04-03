#include "parser.hpp"
#include <iostream>

Parser::Parser(Scanner& scanner, NLPEngine& nlp)
    : scanner_(scanner), nlp_(nlp), temp_counter_(0), label_counter_(0),
      had_error_(false) {
    advance(); // load first token
}

// ---- Token management ----

void Parser::advance() {
    previous_ = current_;
    current_ = scanner_.next_token();
    // Skip newlines where they're not structurally meaningful
    // (newlines are only consumed explicitly via expect_newline)
}

bool Parser::check(TokenType type) {
    return current_.type == type;
}

bool Parser::match(TokenType type) {
    if (check(type)) {
        advance();
        return true;
    }
    return false;
}

void Parser::expect(TokenType type, const std::string& /*context*/) {
    if (check(type)) {
        advance();
        return;
    }
    error_at(current_, type);
}

void Parser::expect_newline() {
    if (check(TokenType::NEWLINE)) {
        advance();
        return;
    }
    if (check(TokenType::END_OF_FILE)) {
        return; // EOF is acceptable where newline expected
    }
    error("expected newline, but found '" + current_.lexeme + "'");
    // Try to recover by skipping to next newline
    synchronize();
}

void Parser::skip_newlines() {
    while (check(TokenType::NEWLINE)) {
        advance();
    }
}

void Parser::synchronize() {
    // Skip to next newline or statement-starting keyword
    while (!check(TokenType::NEWLINE) && !check(TokenType::END_OF_FILE)) {
        TokenType t = current_.type;
        if (t == TokenType::KW_IF || t == TokenType::KW_DO ||
            t == TokenType::KW_READ || t == TokenType::KW_WRITE ||
            t == TokenType::KW_INTEGER || t == TokenType::KW_END ||
            t == TokenType::KW_CALL || t == TokenType::KW_RETURN ||
            t == TokenType::KW_STOP || t == TokenType::KW_ELSE) {
            return; // don't consume the keyword
        }
        advance();
    }
    if (check(TokenType::NEWLINE)) advance();
}

void Parser::error(const std::string& msg) {
    had_error_ = true;
    errors_.emplace_back(current_.line, msg);
}

void Parser::error_at(const Token& tok, TokenType expected) {
    had_error_ = true;
    std::string msg = nlp_.diagnose(tok, expected, previous_);
    errors_.emplace_back(tok.line, msg);
}

// ---- TAC helpers ----

std::string Parser::new_temp() {
    return "t" + std::to_string(temp_counter_++);
}

std::string Parser::new_label() {
    return "L" + std::to_string(label_counter_++);
}

void Parser::emit(TACOp op, const std::string& result,
                  const std::string& arg1, const std::string& arg2) {
    tac_code_.emplace_back(op, result, arg1, arg2);
}

// ---- Grammar rules ----

bool Parser::parse() {
    skip_newlines();
    parse_program();

    // Parse any trailing subroutines
    while (!check(TokenType::END_OF_FILE)) {
        skip_newlines();
        if (check(TokenType::KW_SUBROUTINE)) {
            parse_subroutine();
        } else if (check(TokenType::END_OF_FILE)) {
            break;
        } else {
            error("expected SUBROUTINE or end of file, but found '" + current_.lexeme + "'");
            synchronize();
        }
    }

    return !had_error_;
}

void Parser::parse_program() {
    expect(TokenType::KW_PROGRAM, "at start of program");
    if (check(TokenType::IDENTIFIER)) {
        std::string prog_name = current_.lexeme;
        symtab_.declare(prog_name, SymbolKind::PROGRAM, 0, current_.line);
        advance();
    } else {
        error("expected program name after PROGRAM");
    }
    expect_newline();

    emit(TACOp::LABEL, "PROGRAM_START");
    skip_newlines();
    parse_body(false);

    // END PROGRAM name
    expect(TokenType::KW_END, "at end of program");
    match(TokenType::KW_PROGRAM); // optional 'PROGRAM' after END
    if (check(TokenType::IDENTIFIER)) {
        advance(); // optional program name
    }
    emit(TACOp::HALT, "");
    if (!check(TokenType::END_OF_FILE)) {
        expect_newline();
    }
}

void Parser::parse_subroutine() {
    expect(TokenType::KW_SUBROUTINE, "");
    std::string sub_name;
    if (check(TokenType::IDENTIFIER)) {
        sub_name = current_.lexeme;
        symtab_.declare(sub_name, SymbolKind::SUBROUTINE, 0, current_.line);
        advance();
    } else {
        error("expected subroutine name after SUBROUTINE");
        sub_name = "UNKNOWN_SUB";
    }

    emit(TACOp::LABEL, canonical_name(sub_name));
    symtab_.enter_scope();

    // Parameter list
    expect(TokenType::LPAREN, "after subroutine name");
    if (!check(TokenType::RPAREN)) {
        // Parse parameter list
        do {
            if (check(TokenType::IDENTIFIER)) {
                symtab_.declare(current_.lexeme, SymbolKind::VARIABLE, 0, current_.line);
                advance();
            } else {
                error("expected parameter name");
                break;
            }
        } while (match(TokenType::COMMA));
    }
    expect(TokenType::RPAREN, "after parameter list");
    expect_newline();

    skip_newlines();
    parse_body(true);

    // END SUBROUTINE name
    expect(TokenType::KW_END, "at end of subroutine");
    match(TokenType::KW_SUBROUTINE);
    if (check(TokenType::IDENTIFIER)) advance();
    emit(TACOp::RETURN_OP, "");

    symtab_.exit_scope();

    if (!check(TokenType::END_OF_FILE)) {
        expect_newline();
    }
}

void Parser::parse_body(bool /*in_subroutine*/) {
    while (true) {
        skip_newlines();

        if (check(TokenType::END_OF_FILE)) break;
        if (check(TokenType::KW_END)) break;
        if (check(TokenType::KW_ELSE)) break;

        if (check(TokenType::KW_INTEGER)) {
            parse_declaration();
        } else {
            parse_statement();
        }
    }
}

void Parser::parse_declaration() {
    // INTEGER var_decl { , var_decl }
    expect(TokenType::KW_INTEGER, "");

    do {
        if (check(TokenType::IDENTIFIER)) {
            std::string var_name = current_.lexeme;
            int line = current_.line;
            advance();

            if (match(TokenType::LPAREN)) {
                // Array declaration: name(size)
                if (check(TokenType::INTEGER_LIT)) {
                    int size = std::stoi(current_.lexeme);
                    advance();
                    if (!symtab_.declare(var_name, SymbolKind::ARRAY, size, line)) {
                        error("redeclaration of '" + var_name + "'");
                    }
                } else {
                    error("expected array size (integer literal)");
                }
                expect(TokenType::RPAREN, "after array size");
            } else {
                if (!symtab_.declare(var_name, SymbolKind::VARIABLE, 0, line)) {
                    error("redeclaration of '" + var_name + "'");
                }
            }
        } else {
            error("expected variable name in declaration");
            synchronize();
            return;
        }
    } while (match(TokenType::COMMA));

    expect_newline();
}

void Parser::parse_statement() {
    if (check(TokenType::IDENTIFIER)) {
        // Heuristic: if this identifier looks like a misspelled keyword
        // and the next token isn't '=' or '(' (i.e., not an assignment/array)
        Token peeked = scanner_.peek_token();
        if (peeked.type != TokenType::OP_ASSIGN && peeked.type != TokenType::LPAREN) {
            std::string suggestion = nlp_.suggest_keyword(current_.lexeme);
            if (!suggestion.empty()) {
                error("unknown keyword '" + current_.lexeme + "' -- Did you mean '" + suggestion + "'?");
                synchronize();
                return;
            }
        }

        Token id_tok = current_;
        std::string id_name = current_.lexeme;
        advance();
        parse_assignment(id_name, id_tok);
    } else if (check(TokenType::KW_READ)) {
        parse_read_stmt();
    } else if (check(TokenType::KW_WRITE)) {
        parse_write_stmt();
    } else if (check(TokenType::KW_IF)) {
        parse_if_stmt();
    } else if (check(TokenType::KW_DO)) {
        parse_do_stmt();
    } else if (check(TokenType::KW_CALL)) {
        parse_call_stmt();
    } else if (check(TokenType::KW_RETURN)) {
        parse_return_stmt();
    } else if (check(TokenType::KW_STOP)) {
        parse_stop_stmt();
    } else {
        error("unexpected token '" + current_.lexeme + "' at start of statement");

        // Check if it's a misspelled keyword
        std::string suggestion = nlp_.suggest_keyword(current_.lexeme);
        if (!suggestion.empty()) {
            errors_.back().message += " -- Did you mean '" + suggestion + "'?";
        }

        synchronize();
    }
}

void Parser::parse_assignment(const std::string& id_name, const Token& /*id_tok*/) {
    std::string canon = canonical_name(id_name);

    if (match(TokenType::LPAREN)) {
        // Array element assignment: id(expr) = expr
        std::string index = parse_expression();
        expect(TokenType::RPAREN, "after array index");
        expect(TokenType::OP_ASSIGN, "in assignment");
        std::string value = parse_expression();
        emit(TACOp::ARRAY_STORE, value, canon, index);
    } else {
        // Simple assignment: id = expr
        expect(TokenType::OP_ASSIGN, "in assignment");
        std::string value = parse_expression();
        emit(TACOp::ASSIGN, canon, value);
    }

    expect_newline();
}

void Parser::parse_read_stmt() {
    expect(TokenType::KW_READ, "");
    expect(TokenType::LPAREN, "after READ");

    do {
        if (check(TokenType::IDENTIFIER)) {
            std::string var_name = canonical_name(current_.lexeme);
            advance();

            if (match(TokenType::LPAREN)) {
                // Array element: READ(A(I))
                std::string index = parse_expression();
                expect(TokenType::RPAREN, "after array index in READ");
                std::string temp = new_temp();
                emit(TACOp::READ_OP, temp);
                emit(TACOp::ARRAY_STORE, temp, var_name, index);
            } else {
                emit(TACOp::READ_OP, var_name);
            }
        } else {
            error("expected variable name in READ");
            break;
        }
    } while (match(TokenType::COMMA));

    expect(TokenType::RPAREN, "after READ variable list");
    expect_newline();
}

void Parser::parse_write_stmt() {
    expect(TokenType::KW_WRITE, "");
    expect(TokenType::LPAREN, "after WRITE");

    do {
        if (check(TokenType::STRING_LIT)) {
            std::string str_val = current_.lexeme;
            advance();
            emit(TACOp::WRITE_STR, str_val);
        } else {
            std::string val = parse_expression();
            emit(TACOp::WRITE_OP, val);
        }
    } while (match(TokenType::COMMA));

    expect(TokenType::RPAREN, "after WRITE argument list");
    expect_newline();
}

void Parser::parse_if_stmt() {
    expect(TokenType::KW_IF, "");
    expect(TokenType::LPAREN, "after IF");

    std::string lhs = parse_expression();
    std::string relop = parse_relop();
    std::string rhs = parse_expression();

    expect(TokenType::RPAREN, "after IF condition");
    expect(TokenType::KW_THEN, "after IF condition");
    expect_newline();

    std::string else_label = new_label();
    std::string end_label = new_label();

    // Emit negated conditional jump to else/end
    TACOp jump_op;
    if (relop == "EQ")      jump_op = TACOp::IF_NE;
    else if (relop == "NE") jump_op = TACOp::IF_EQ;
    else if (relop == "LT") jump_op = TACOp::IF_GE;
    else if (relop == "GT") jump_op = TACOp::IF_LE;
    else if (relop == "LE") jump_op = TACOp::IF_GT;
    else if (relop == "GE") jump_op = TACOp::IF_LT;
    else                    jump_op = TACOp::IF_NE; // fallback

    emit(jump_op, else_label, lhs, rhs);

    skip_newlines();
    parse_body();

    if (check(TokenType::KW_ELSE)) {
        advance();
        expect_newline();
        emit(TACOp::GOTO, end_label);
        emit(TACOp::LABEL, else_label);
        skip_newlines();
        parse_body();
        emit(TACOp::LABEL, end_label);
    } else {
        emit(TACOp::LABEL, else_label);
    }

    // END IF
    expect(TokenType::KW_END, "at end of IF block");
    expect(TokenType::KW_IF, "after END in IF block");
    expect_newline();
}

void Parser::parse_do_stmt() {
    expect(TokenType::KW_DO, "");

    if (!check(TokenType::IDENTIFIER)) {
        error("expected loop variable after DO");
        synchronize();
        return;
    }
    std::string loop_var = canonical_name(current_.lexeme);
    advance();

    expect(TokenType::OP_ASSIGN, "after loop variable");
    std::string start_val = parse_expression();
    expect(TokenType::COMMA, "after start value in DO");
    std::string end_val = parse_expression();

    std::string step_val;
    if (match(TokenType::COMMA)) {
        step_val = parse_expression();
    } else {
        step_val = "1";
    }
    expect_newline();

    std::string loop_start = new_label();
    std::string loop_end = new_label();

    // Initialize loop variable
    emit(TACOp::ASSIGN, loop_var, start_val);
    emit(TACOp::LABEL, loop_start);

    // Check loop condition: if loop_var > end_val, goto loop_end
    emit(TACOp::IF_GT, loop_end, loop_var, end_val);

    skip_newlines();
    parse_body();

    // Increment and loop back
    std::string next_val = new_temp();
    emit(TACOp::ADD, next_val, loop_var, step_val);
    emit(TACOp::ASSIGN, loop_var, next_val);
    emit(TACOp::GOTO, loop_start);
    emit(TACOp::LABEL, loop_end);

    // END DO
    expect(TokenType::KW_END, "at end of DO loop");
    expect(TokenType::KW_DO, "after END in DO loop");
    expect_newline();
}

void Parser::parse_call_stmt() {
    expect(TokenType::KW_CALL, "");

    if (!check(TokenType::IDENTIFIER)) {
        error("expected subroutine name after CALL");
        synchronize();
        return;
    }
    std::string sub_name = canonical_name(current_.lexeme);
    advance();

    expect(TokenType::LPAREN, "after subroutine name in CALL");

    int param_count = 0;
    if (!check(TokenType::RPAREN)) {
        do {
            std::string arg = parse_expression();
            emit(TACOp::PARAM, arg);
            param_count++;
        } while (match(TokenType::COMMA));
    }

    expect(TokenType::RPAREN, "after argument list in CALL");
    emit(TACOp::CALL, sub_name, std::to_string(param_count));
    expect_newline();
}

void Parser::parse_return_stmt() {
    expect(TokenType::KW_RETURN, "");
    emit(TACOp::RETURN_OP, "");
    expect_newline();
}

void Parser::parse_stop_stmt() {
    expect(TokenType::KW_STOP, "");
    emit(TACOp::HALT, "");
    expect_newline();
}

// ---- Expression parsing ----

std::string Parser::parse_expression() {
    std::string left = parse_term();

    while (check(TokenType::OP_PLUS) || check(TokenType::OP_MINUS)) {
        TACOp op = check(TokenType::OP_PLUS) ? TACOp::ADD : TACOp::SUB;
        advance();
        std::string right = parse_term();
        std::string temp = new_temp();
        emit(op, temp, left, right);
        left = temp;
    }

    return left;
}

std::string Parser::parse_term() {
    std::string left = parse_factor();

    while (check(TokenType::OP_STAR) || check(TokenType::OP_SLASH)) {
        TACOp op = check(TokenType::OP_STAR) ? TACOp::MUL : TACOp::DIV;
        advance();
        std::string right = parse_factor();
        std::string temp = new_temp();
        emit(op, temp, left, right);
        left = temp;
    }

    return left;
}

std::string Parser::parse_factor() {
    // Unary +/-
    if (check(TokenType::OP_MINUS)) {
        advance();
        std::string operand = parse_factor();
        std::string temp = new_temp();
        emit(TACOp::SUB, temp, "0", operand);
        return temp;
    }
    if (check(TokenType::OP_PLUS)) {
        advance();
        return parse_factor();
    }

    // Parenthesized expression
    if (match(TokenType::LPAREN)) {
        std::string result = parse_expression();
        expect(TokenType::RPAREN, "in expression");
        return result;
    }

    // Integer literal
    if (check(TokenType::INTEGER_LIT)) {
        std::string val = current_.lexeme;
        advance();
        return val;
    }

    // Identifier or array access
    if (check(TokenType::IDENTIFIER)) {
        std::string name = canonical_name(current_.lexeme);
        advance();

        if (match(TokenType::LPAREN)) {
            // Array access: name(expr)
            std::string index = parse_expression();
            expect(TokenType::RPAREN, "after array index");
            std::string temp = new_temp();
            emit(TACOp::ARRAY_LOAD, temp, name, index);
            return temp;
        }

        return name;
    }

    // Error case
    error("expected expression, but found '" + current_.lexeme + "'");
    std::string suggestion = nlp_.suggest_keyword(current_.lexeme);
    if (!suggestion.empty()) {
        errors_.back().message += " -- Did you mean '" + suggestion + "'?";
    }
    advance(); // skip the bad token
    return "0"; // return dummy value to continue parsing
}

std::string Parser::parse_relop() {
    TokenType t = current_.type;
    std::string op;

    switch (t) {
        case TokenType::OP_EQ: op = "EQ"; break;
        case TokenType::OP_NE: op = "NE"; break;
        case TokenType::OP_LT: op = "LT"; break;
        case TokenType::OP_GT: op = "GT"; break;
        case TokenType::OP_LE: op = "LE"; break;
        case TokenType::OP_GE: op = "GE"; break;
        default:
            error("expected relational operator (.EQ., .NE., .LT., .GT., .LE., .GE., or <, >, ==, /=, <=, >=)");
            return "EQ";
    }

    advance();
    return op;
}
