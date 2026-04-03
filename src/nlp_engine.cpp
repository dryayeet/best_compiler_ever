#include "nlp_engine.hpp"
#include <algorithm>
#include <climits>

NLPEngine::NLPEngine() {
    init_keywords();
    init_bigram_table();
}

void NLPEngine::init_keywords() {
    for (const auto& pair : keyword_map()) {
        keywords_.push_back(pair.first);
    }
}

void NLPEngine::init_bigram_table() {
    // Hand-coded from the F-Lite grammar: what typically follows each token type
    bigram_table_[static_cast<int>(TokenType::KW_PROGRAM)]    = "a program name (identifier)";
    bigram_table_[static_cast<int>(TokenType::KW_INTEGER)]    = "a variable name or array declaration";
    bigram_table_[static_cast<int>(TokenType::KW_READ)]       = "'(' followed by a variable list";
    bigram_table_[static_cast<int>(TokenType::KW_WRITE)]      = "'(' followed by expressions or strings";
    bigram_table_[static_cast<int>(TokenType::KW_IF)]         = "'(' followed by a condition";
    bigram_table_[static_cast<int>(TokenType::KW_THEN)]       = "a newline, then statement(s)";
    bigram_table_[static_cast<int>(TokenType::KW_ELSE)]       = "a newline, then statement(s)";
    bigram_table_[static_cast<int>(TokenType::KW_DO)]         = "a loop variable (identifier) followed by '='";
    bigram_table_[static_cast<int>(TokenType::KW_END)]        = "'PROGRAM', 'IF', 'DO', or 'SUBROUTINE'";
    bigram_table_[static_cast<int>(TokenType::KW_SUBROUTINE)] = "a subroutine name (identifier)";
    bigram_table_[static_cast<int>(TokenType::KW_CALL)]       = "a subroutine name (identifier)";
    bigram_table_[static_cast<int>(TokenType::KW_RETURN)]     = "a newline";
    bigram_table_[static_cast<int>(TokenType::KW_STOP)]       = "a newline";
    bigram_table_[static_cast<int>(TokenType::OP_ASSIGN)]     = "an expression";
    bigram_table_[static_cast<int>(TokenType::OP_PLUS)]       = "an expression (operand)";
    bigram_table_[static_cast<int>(TokenType::OP_MINUS)]      = "an expression (operand)";
    bigram_table_[static_cast<int>(TokenType::OP_STAR)]       = "an expression (operand)";
    bigram_table_[static_cast<int>(TokenType::OP_SLASH)]      = "an expression (operand)";
    bigram_table_[static_cast<int>(TokenType::LPAREN)]        = "an expression or identifier";
    bigram_table_[static_cast<int>(TokenType::RPAREN)]        = "an operator, ')', ',', or newline";
    bigram_table_[static_cast<int>(TokenType::COMMA)]         = "an expression or identifier";
    bigram_table_[static_cast<int>(TokenType::IDENTIFIER)]    = "'=', '(', ',', an operator, or newline";
    bigram_table_[static_cast<int>(TokenType::INTEGER_LIT)]   = "an operator, ')', ',', or newline";
    bigram_table_[static_cast<int>(TokenType::OP_EQ)]         = "an expression";
    bigram_table_[static_cast<int>(TokenType::OP_NE)]         = "an expression";
    bigram_table_[static_cast<int>(TokenType::OP_LT)]         = "an expression";
    bigram_table_[static_cast<int>(TokenType::OP_GT)]         = "an expression";
    bigram_table_[static_cast<int>(TokenType::OP_LE)]         = "an expression";
    bigram_table_[static_cast<int>(TokenType::OP_GE)]         = "an expression";
}

// Two-row DP Levenshtein distance
int NLPEngine::levenshtein(const std::string& a, const std::string& b) {
    const size_t m = a.size();
    const size_t n = b.size();

    if (m == 0) return static_cast<int>(n);
    if (n == 0) return static_cast<int>(m);

    std::vector<int> prev(n + 1);
    std::vector<int> curr(n + 1);

    for (size_t j = 0; j <= n; ++j)
        prev[j] = static_cast<int>(j);

    for (size_t i = 1; i <= m; ++i) {
        curr[0] = static_cast<int>(i);
        for (size_t j = 1; j <= n; ++j) {
            int cost = (toupper(a[i - 1]) == toupper(b[j - 1])) ? 0 : 1;
            curr[j] = std::min({
                prev[j] + 1,       // deletion
                curr[j - 1] + 1,   // insertion
                prev[j - 1] + cost // substitution
            });
        }
        std::swap(prev, curr);
    }

    return prev[n];
}

std::string NLPEngine::suggest_keyword(const std::string& misspelled) const {
    std::string upper = to_upper(misspelled);
    int best_dist = INT_MAX;
    std::string best_keyword;

    for (const auto& kw : keywords_) {
        int dist = levenshtein(upper, kw);
        if (dist < best_dist) {
            best_dist = dist;
            best_keyword = kw;
        }
    }

    // Only suggest if edit distance <= 2
    if (best_dist <= 2 && best_dist > 0) {
        return best_keyword;
    }
    return "";
}

std::string NLPEngine::expected_after(TokenType prev) const {
    auto it = bigram_table_.find(static_cast<int>(prev));
    if (it != bigram_table_.end()) {
        return it->second;
    }
    return "";
}

std::string NLPEngine::diagnose(const Token& found, TokenType expected,
                                 const Token& previous) const {
    std::string msg;

    // Primary error message
    msg += "Error (line " + std::to_string(found.line) + "): ";
    msg += "expected " + token_type_name(expected);
    msg += ", but found '" + found.lexeme + "'";

    // Levenshtein suggestion for identifiers that look like misspelled keywords
    if (found.type == TokenType::IDENTIFIER || found.type == TokenType::UNKNOWN) {
        std::string suggestion = suggest_keyword(found.lexeme);
        if (!suggestion.empty()) {
            msg += " -- Did you mean '" + suggestion + "'?";
        }
    }

    // Bigram hint based on previous token
    std::string hint = expected_after(previous.type);
    if (!hint.empty()) {
        msg += "\n     Hint: after " + token_type_name(previous.type)
             + ", typically " + hint + " follows.";
    }

    return msg;
}
