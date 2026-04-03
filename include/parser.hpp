#ifndef FLITE_PARSER_HPP
#define FLITE_PARSER_HPP

#include <string>
#include <vector>
#include "token.hpp"
#include "scanner.hpp"
#include "nlp_engine.hpp"
#include "symbol_table.hpp"
#include "codegen.hpp"

class Parser {
public:
    Parser(Scanner& scanner, NLPEngine& nlp);

    bool parse();   // returns true if no errors

    const std::vector<TACInstr>& tac() const { return tac_code_; }
    const std::vector<Diagnostic>& errors() const { return errors_; }

private:
    Scanner& scanner_;
    NLPEngine& nlp_;
    SymbolTable symtab_;
    Token current_;
    Token previous_;
    std::vector<Diagnostic> errors_;
    std::vector<TACInstr> tac_code_;
    int temp_counter_;
    int label_counter_;
    bool had_error_;

    // Token management
    void advance();
    bool check(TokenType type);
    bool match(TokenType type);
    void expect(TokenType type, const std::string& context);
    void expect_newline();
    void skip_newlines();
    void synchronize();
    void error(const std::string& msg);
    void error_at(const Token& tok, TokenType expected);

    // TAC helpers
    std::string new_temp();
    std::string new_label();
    void emit(TACOp op, const std::string& result,
              const std::string& arg1 = "", const std::string& arg2 = "");

    // Grammar rules
    void parse_program();
    void parse_subroutine();
    void parse_body(bool in_subroutine = false);
    void parse_declaration();
    void parse_statement();
    void parse_assignment(const std::string& id_name, const Token& id_tok);
    void parse_read_stmt();
    void parse_write_stmt();
    void parse_if_stmt();
    void parse_do_stmt();
    void parse_call_stmt();
    void parse_return_stmt();
    void parse_stop_stmt();

    // Expression parsing (returns temp/var name holding result)
    std::string parse_expression();
    std::string parse_term();
    std::string parse_factor();
    std::string parse_relop();  // returns relop as string, e.g. ".EQ."
};

#endif // FLITE_PARSER_HPP
