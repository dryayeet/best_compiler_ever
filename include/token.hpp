#ifndef FLITE_TOKEN_HPP
#define FLITE_TOKEN_HPP

#include <string>
#include <unordered_map>
#include <algorithm>

enum class TokenType {
    // Literals
    INTEGER_LIT,
    STRING_LIT,
    IDENTIFIER,

    // Keywords
    KW_PROGRAM,
    KW_INTEGER,
    KW_READ,
    KW_WRITE,
    KW_IF,
    KW_THEN,
    KW_ELSE,
    KW_DO,
    KW_END,
    KW_SUBROUTINE,
    KW_CALL,
    KW_RETURN,
    KW_STOP,

    // Operators
    OP_PLUS,        // +
    OP_MINUS,       // -
    OP_STAR,        // *
    OP_SLASH,       // /
    OP_ASSIGN,      // =

    // Relational operators
    OP_EQ,          // .EQ. or ==
    OP_NE,          // .NE. or /=
    OP_LT,          // .LT. or <
    OP_GT,          // .GT. or >
    OP_LE,          // .LE. or <=
    OP_GE,          // .GE. or >=

    // Delimiters
    LPAREN,         // (
    RPAREN,         // )
    COMMA,          // ,
    COLON,          // :

    // Special
    NEWLINE,
    END_OF_FILE,
    UNKNOWN
};

struct Token {
    TokenType type;
    std::string lexeme;
    int line;
    int column;

    Token() : type(TokenType::END_OF_FILE), line(0), column(0) {}
    Token(TokenType t, const std::string& lex, int ln, int col)
        : type(t), lexeme(lex), line(ln), column(col) {}
};

inline std::string to_upper(const std::string& s) {
    std::string result = s;
    std::transform(result.begin(), result.end(), result.begin(), ::toupper);
    return result;
}

inline std::string canonical_name(const std::string& name) {
    std::string upper = to_upper(name);
    if (upper.size() > 32) upper.resize(32);
    return upper;
}

inline const std::unordered_map<std::string, TokenType>& keyword_map() {
    static const std::unordered_map<std::string, TokenType> kw = {
        {"PROGRAM",    TokenType::KW_PROGRAM},
        {"INTEGER",    TokenType::KW_INTEGER},
        {"READ",       TokenType::KW_READ},
        {"WRITE",      TokenType::KW_WRITE},
        {"IF",         TokenType::KW_IF},
        {"THEN",       TokenType::KW_THEN},
        {"ELSE",       TokenType::KW_ELSE},
        {"DO",         TokenType::KW_DO},
        {"END",        TokenType::KW_END},
        {"SUBROUTINE", TokenType::KW_SUBROUTINE},
        {"CALL",       TokenType::KW_CALL},
        {"RETURN",     TokenType::KW_RETURN},
        {"STOP",       TokenType::KW_STOP}
    };
    return kw;
}

inline TokenType lookup_keyword(const std::string& id) {
    std::string upper = to_upper(id);
    const auto& kw = keyword_map();
    auto it = kw.find(upper);
    if (it != kw.end()) return it->second;
    return TokenType::IDENTIFIER;
}

inline std::string token_type_name(TokenType t) {
    switch (t) {
        case TokenType::INTEGER_LIT:   return "INTEGER_LIT";
        case TokenType::STRING_LIT:    return "STRING_LIT";
        case TokenType::IDENTIFIER:    return "IDENTIFIER";
        case TokenType::KW_PROGRAM:    return "PROGRAM";
        case TokenType::KW_INTEGER:    return "INTEGER";
        case TokenType::KW_READ:       return "READ";
        case TokenType::KW_WRITE:      return "WRITE";
        case TokenType::KW_IF:         return "IF";
        case TokenType::KW_THEN:       return "THEN";
        case TokenType::KW_ELSE:       return "ELSE";
        case TokenType::KW_DO:         return "DO";
        case TokenType::KW_END:        return "END";
        case TokenType::KW_SUBROUTINE: return "SUBROUTINE";
        case TokenType::KW_CALL:       return "CALL";
        case TokenType::KW_RETURN:     return "RETURN";
        case TokenType::KW_STOP:       return "STOP";
        case TokenType::OP_PLUS:       return "'+'";
        case TokenType::OP_MINUS:      return "'-'";
        case TokenType::OP_STAR:       return "'*'";
        case TokenType::OP_SLASH:      return "'/'";
        case TokenType::OP_ASSIGN:     return "'='";
        case TokenType::OP_EQ:         return "'.EQ.'";
        case TokenType::OP_NE:         return "'.NE.'";
        case TokenType::OP_LT:         return "'.LT.'";
        case TokenType::OP_GT:         return "'.GT.'";
        case TokenType::OP_LE:         return "'.LE.'";
        case TokenType::OP_GE:         return "'.GE.'";
        case TokenType::LPAREN:        return "'('";
        case TokenType::RPAREN:        return "')'";
        case TokenType::COMMA:         return "','";
        case TokenType::COLON:         return "':'";
        case TokenType::NEWLINE:       return "NEWLINE";
        case TokenType::END_OF_FILE:   return "EOF";
        case TokenType::UNKNOWN:       return "UNKNOWN";
    }
    return "UNKNOWN";
}

#endif // FLITE_TOKEN_HPP
