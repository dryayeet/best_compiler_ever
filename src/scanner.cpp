#include "scanner.hpp"
#include <cctype>
#include <sstream>

Scanner::Scanner(const std::string& source, const std::string& filename)
    : source_(source), filename_(filename), pos_(0), line_(1), col_(1),
      has_peeked_(false) {
    // Split source into lines for the listing manager
    std::istringstream stream(source);
    std::string line;
    while (std::getline(stream, line)) {
        // Remove trailing \r if present
        if (!line.empty() && line.back() == '\r')
            line.pop_back();
        lines_.push_back(line);
    }
}

char Scanner::current() const {
    if (at_end()) return '\0';
    return source_[pos_];
}

char Scanner::peek_char() const {
    if (pos_ + 1 >= source_.size()) return '\0';
    return source_[pos_ + 1];
}

char Scanner::advance() {
    char c = source_[pos_];
    pos_++;
    col_++;
    return c;
}

bool Scanner::at_end() const {
    return pos_ >= source_.size();
}

void Scanner::skip_whitespace() {
    while (!at_end()) {
        char c = current();
        if (c == ' ' || c == '\t' || c == '\r') {
            advance();
        } else {
            break;
        }
    }
}

void Scanner::skip_comment() {
    // Skip from ! to end of line (but don't consume the newline)
    while (!at_end() && current() != '\n') {
        advance();
    }
}

Token Scanner::make_token(TokenType type, const std::string& lexeme, int start_col) {
    return Token(type, lexeme, line_, start_col);
}

Token Scanner::scan_identifier() {
    int start_col = col_;
    std::string lexeme;

    while (!at_end() && (std::isalnum(current()) || current() == '_')) {
        lexeme += advance();
    }

    TokenType type = lookup_keyword(lexeme);
    return make_token(type, lexeme, start_col);
}

Token Scanner::scan_number() {
    int start_col = col_;
    std::string lexeme;

    while (!at_end() && std::isdigit(current())) {
        lexeme += advance();
    }

    return make_token(TokenType::INTEGER_LIT, lexeme, start_col);
}

Token Scanner::scan_string() {
    int start_col = col_;
    advance(); // consume opening apostrophe
    std::string lexeme;
    std::string raw = "'";

    while (!at_end() && current() != '\n') {
        if (current() == '\\') {
            raw += advance();
            if (!at_end()) {
                char esc = advance();
                raw += esc;
                switch (esc) {
                    case 'n':  lexeme += '\n'; break;
                    case 't':  lexeme += '\t'; break;
                    case '\'': lexeme += '\''; break;
                    case '\\': lexeme += '\\'; break;
                    default:   lexeme += '\\'; lexeme += esc; break;
                }
            }
        } else if (current() == '\'') {
            raw += advance(); // consume closing apostrophe
            return Token(TokenType::STRING_LIT, lexeme, line_, start_col);
        } else {
            char c = advance();
            lexeme += c;
            raw += c;
        }
    }

    // Unterminated string - return what we have as UNKNOWN
    return make_token(TokenType::UNKNOWN, raw, start_col);
}

Token Scanner::scan_dot_operator() {
    int start_col = col_;

    // Check for .EQ., .NE., .LT., .GT., .LE., .GE.
    if (pos_ + 3 < source_.size()) {
        char c1 = toupper(source_[pos_ + 1]);
        char c2 = toupper(source_[pos_ + 2]);
        char c3 = source_[pos_ + 3];

        if (c3 == '.') {
            TokenType type = TokenType::UNKNOWN;
            std::string lexeme;

            if (c1 == 'E' && c2 == 'Q')      { type = TokenType::OP_EQ; lexeme = ".EQ."; }
            else if (c1 == 'N' && c2 == 'E')  { type = TokenType::OP_NE; lexeme = ".NE."; }
            else if (c1 == 'L' && c2 == 'T')  { type = TokenType::OP_LT; lexeme = ".LT."; }
            else if (c1 == 'G' && c2 == 'T')  { type = TokenType::OP_GT; lexeme = ".GT."; }
            else if (c1 == 'L' && c2 == 'E')  { type = TokenType::OP_LE; lexeme = ".LE."; }
            else if (c1 == 'G' && c2 == 'E')  { type = TokenType::OP_GE; lexeme = ".GE."; }

            if (type != TokenType::UNKNOWN) {
                advance(); advance(); advance(); advance(); // consume .XX.
                return make_token(type, lexeme, start_col);
            }
        }
    }

    // Not a recognized dot-operator, return as UNKNOWN
    std::string lexeme(1, advance());
    return make_token(TokenType::UNKNOWN, lexeme, start_col);
}

Token Scanner::scan_next() {
    skip_whitespace();

    if (at_end()) {
        return make_token(TokenType::END_OF_FILE, "", col_);
    }

    char c = current();
    int start_col = col_;

    // Newline
    if (c == '\n') {
        advance();
        Token tok = make_token(TokenType::NEWLINE, "\\n", start_col);
        tok.line = line_; // newline belongs to the line it terminates
        line_++;
        col_ = 1;
        return tok;
    }

    // Comment
    if (c == '!') {
        skip_comment();
        return scan_next(); // recurse to get next meaningful token
    }

    // Identifier or keyword
    if (std::isalpha(c) || c == '_') {
        return scan_identifier();
    }

    // Number
    if (std::isdigit(c)) {
        return scan_number();
    }

    // String literal
    if (c == '\'') {
        return scan_string();
    }

    // Dot operator (.EQ., .LT., etc.)
    if (c == '.') {
        return scan_dot_operator();
    }

    // Single and double character operators
    advance();
    switch (c) {
        case '+': return make_token(TokenType::OP_PLUS,  "+", start_col);
        case '-': return make_token(TokenType::OP_MINUS, "-", start_col);
        case '*': return make_token(TokenType::OP_STAR,  "*", start_col);
        case '(': return make_token(TokenType::LPAREN,   "(", start_col);
        case ')': return make_token(TokenType::RPAREN,   ")", start_col);
        case ',': return make_token(TokenType::COMMA,    ",", start_col);
        case ':': return make_token(TokenType::COLON,    ":", start_col);

        case '=':
            if (!at_end() && current() == '=') {
                advance();
                return make_token(TokenType::OP_EQ, "==", start_col);
            }
            return make_token(TokenType::OP_ASSIGN, "=", start_col);

        case '<':
            if (!at_end() && current() == '=') {
                advance();
                return make_token(TokenType::OP_LE, "<=", start_col);
            }
            return make_token(TokenType::OP_LT, "<", start_col);

        case '>':
            if (!at_end() && current() == '=') {
                advance();
                return make_token(TokenType::OP_GE, ">=", start_col);
            }
            return make_token(TokenType::OP_GT, ">", start_col);

        case '/':
            if (!at_end() && current() == '=') {
                advance();
                return make_token(TokenType::OP_NE, "/=", start_col);
            }
            return make_token(TokenType::OP_SLASH, "/", start_col);

        default:
            return make_token(TokenType::UNKNOWN, std::string(1, c), start_col);
    }
}

Token Scanner::next_token() {
    if (has_peeked_) {
        has_peeked_ = false;
        return peeked_;
    }
    return scan_next();
}

Token Scanner::peek_token() {
    if (!has_peeked_) {
        peeked_ = scan_next();
        has_peeked_ = true;
    }
    return peeked_;
}
