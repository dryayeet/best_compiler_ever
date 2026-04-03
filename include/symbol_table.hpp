#ifndef FLITE_SYMBOL_TABLE_HPP
#define FLITE_SYMBOL_TABLE_HPP

#include <string>
#include <vector>
#include <algorithm>
#include "token.hpp"

enum class SymbolKind {
    VARIABLE,
    ARRAY,
    SUBROUTINE,
    PROGRAM
};

struct Symbol {
    std::string name;       // canonical: uppercase, max 32 chars
    SymbolKind kind;
    int array_size;         // 0 if not array
    int scope_level;
    int line_declared;

    Symbol() : kind(SymbolKind::VARIABLE), array_size(0), scope_level(0), line_declared(0) {}
    Symbol(const std::string& n, SymbolKind k, int arr_sz, int scope, int line)
        : name(n), kind(k), array_size(arr_sz), scope_level(scope), line_declared(line) {}
};

class SymbolTable {
public:
    SymbolTable() : current_scope_(0) {}

    bool declare(const std::string& raw_name, SymbolKind kind, int array_size, int line) {
        std::string name = canonical_name(raw_name);

        // Check for redeclaration in current scope
        for (const auto& sym : symbols_) {
            if (sym.name == name && sym.scope_level == current_scope_) {
                return false; // already declared
            }
        }

        symbols_.emplace_back(name, kind, array_size, current_scope_, line);
        return true;
    }

    Symbol* lookup(const std::string& raw_name) {
        std::string name = canonical_name(raw_name);

        // Search from current scope outward
        for (int scope = current_scope_; scope >= 0; --scope) {
            for (auto& sym : symbols_) {
                if (sym.name == name && sym.scope_level == scope) {
                    return &sym;
                }
            }
        }
        return nullptr;
    }

    void enter_scope() { current_scope_++; }

    void exit_scope() {
        // Remove symbols in the current scope
        symbols_.erase(
            std::remove_if(symbols_.begin(), symbols_.end(),
                [this](const Symbol& s) { return s.scope_level == current_scope_; }),
            symbols_.end());
        current_scope_--;
    }

    int current_scope() const { return current_scope_; }
    const std::vector<Symbol>& all_symbols() const { return symbols_; }

private:
    std::vector<Symbol> symbols_;
    int current_scope_;
};

#endif // FLITE_SYMBOL_TABLE_HPP
