#include <iostream>
#include <fstream>
#include <sstream>
#include <string>

#include "token.hpp"
#include "scanner.hpp"
#include "nlp_engine.hpp"
#include "parser.hpp"
#include "codegen.hpp"
#include "logger.hpp"

static std::string read_file(const std::string& path) {
    std::ifstream file(path);
    if (!file.is_open()) {
        std::cerr << "Error: cannot open file '" << path << "'\n";
        return "";
    }
    std::ostringstream ss;
    ss << file.rdbuf();
    return ss.str();
}

static std::string replace_extension(const std::string& path, const std::string& new_ext) {
    size_t dot = path.rfind('.');
    if (dot != std::string::npos) {
        return path.substr(0, dot) + new_ext;
    }
    return path + new_ext;
}

int main(int argc, char* argv[]) {
    std::cout << "F-Lite Compiler v1.0\n";
    std::cout << "====================\n\n";

    if (argc < 2) {
        std::cerr << "Usage: flc <source.fl>\n";
        return 1;
    }

    std::string source_path = argv[1];
    std::string source = read_file(source_path);
    if (source.empty()) {
        return 1;
    }

    // Phase 1: Lexical + Syntactic Analysis with NLP diagnostics
    Scanner scanner(source, source_path);
    NLPEngine nlp;
    Parser parser(scanner, nlp);

    bool success = parser.parse();

    // Always generate listing file
    std::string lst_path = replace_extension(source_path, ".lst");
    Logger::generate_listing(lst_path, source_path,
                             scanner.source_lines(), parser.errors());
    std::cout << "Listing file: " << lst_path << "\n";

    if (!success) {
        std::cout << "\nCompilation FAILED with " << parser.errors().size() << " error(s).\n";
        std::cout << "See listing file for details.\n";

        // Print errors to console as well
        for (const auto& err : parser.errors()) {
            std::cout << "  " << err.message << "\n";
        }
        return 1;
    }

    // Phase 2: Output TAC
    std::string tac_path = replace_extension(source_path, ".tac");
    Logger::write_tac(tac_path, parser.tac());
    std::cout << "TAC output:   " << tac_path << "\n";

    // Phase 3: Target code generation
    TargetCodeGen codegen;
    std::vector<std::string> asm_code = codegen.generate(parser.tac());
    std::string asm_path = replace_extension(source_path, ".asm");
    Logger::write_asm(asm_path, asm_code);
    std::cout << "Assembly:     " << asm_path << "\n";

    std::cout << "\nCompilation SUCCESSFUL. No errors.\n";
    return 0;
}
