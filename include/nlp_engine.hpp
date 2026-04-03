#ifndef FLITE_NLP_ENGINE_HPP
#define FLITE_NLP_ENGINE_HPP

#include <string>
#include <vector>
#include <unordered_map>
#include "token.hpp"

class NLPEngine {
public:
    NLPEngine();

    // Levenshtein-based keyword suggestion. Returns "" if no match within threshold.
    std::string suggest_keyword(const std::string& misspelled) const;

    // Bigram: human-readable description of what is expected after a given token type.
    std::string expected_after(TokenType prev) const;

    // Format a full diagnostic message combining Levenshtein + bigram hints.
    std::string diagnose(const Token& found, TokenType expected, const Token& previous) const;

    // Raw Levenshtein distance (public for testing).
    static int levenshtein(const std::string& a, const std::string& b);

private:
    std::vector<std::string> keywords_;
    std::unordered_map<int, std::string> bigram_table_; // keyed by (int)TokenType

    void init_keywords();
    void init_bigram_table();
};

#endif // FLITE_NLP_ENGINE_HPP
