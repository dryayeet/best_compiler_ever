#ifndef FLITE_LOGGER_HPP
#define FLITE_LOGGER_HPP

#include <string>
#include <vector>
#include "codegen.hpp"

class Logger {
public:
    static void generate_listing(const std::string& output_path,
                                 const std::string& source_filename,
                                 const std::vector<std::string>& source_lines,
                                 const std::vector<Diagnostic>& errors);

    static void write_tac(const std::string& output_path,
                           const std::vector<TACInstr>& tac);

    static void write_asm(const std::string& output_path,
                           const std::vector<std::string>& asm_lines);
};

#endif // FLITE_LOGGER_HPP
