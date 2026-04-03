#ifndef FLITE_SCANNER_HPP
#define FLITE_SCANNER_HPP

#include <string>
#include <vector>
#include "token.hpp"

class Scanner {
public:
    Scanner(const std::string& source, const std::string& filename);

    Token next_token();
    Token peek_token();
    int current_line() const { return line_; }
    const std::vector<std::string>& source_lines() const { return lines_; }

private:
    std::string source_;
    std::string filename_;
    size_t pos_;
    int line_;
    int col_;
    std::vector<std::string> lines_;
    bool has_peeked_;
    Token peeked_;

    char current() const;
    char peek_char() const;
    char advance();
    bool at_end() const;

    void skip_whitespace();
    void skip_comment();

    Token scan_identifier();
    Token scan_number();
    Token scan_string();
    Token scan_dot_operator();
    Token scan_next();

    Token make_token(TokenType type, const std::string& lexeme, int start_col);
};

#endif // FLITE_SCANNER_HPP
