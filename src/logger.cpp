#include "logger.hpp"
#include <fstream>
#include <iomanip>
#include <algorithm>
#include <sstream>

void Logger::generate_listing(const std::string& output_path,
                              const std::string& source_filename,
                              const std::vector<std::string>& source_lines,
                              const std::vector<Diagnostic>& errors) {
    std::ofstream out(output_path);
    if (!out.is_open()) return;

    out << "F-Lite Compiler Listing - " << source_filename << "\n";
    out << std::string(60, '=') << "\n";

    // Sort errors by line number
    std::vector<Diagnostic> sorted_errors = errors;
    std::sort(sorted_errors.begin(), sorted_errors.end(),
        [](const Diagnostic& a, const Diagnostic& b) { return a.line < b.line; });

    size_t err_idx = 0;

    for (size_t i = 0; i < source_lines.size(); ++i) {
        int line_num = static_cast<int>(i + 1);

        // Print source line with line number
        out << std::setw(4) << line_num << " | " << source_lines[i] << "\n";

        // Print any errors for this line
        while (err_idx < sorted_errors.size() &&
               sorted_errors[err_idx].line == line_num) {
            std::istringstream msg_stream(sorted_errors[err_idx].message);
            std::string msg_line;
            bool first = true;
            while (std::getline(msg_stream, msg_line)) {
                if (first) {
                    out << "     | *** " << msg_line << "\n";
                    first = false;
                } else {
                    out << "     |     " << msg_line << "\n";
                }
            }
            err_idx++;
        }
    }

    while (err_idx < sorted_errors.size()) {
        out << "     | *** " << sorted_errors[err_idx].message << "\n";
        err_idx++;
    }

    out << std::string(60, '=') << "\n";
    out << errors.size() << " error(s) found.\n";

    out.close();
}

void Logger::write_tac(const std::string& output_path,
                        const std::vector<TACInstr>& tac) {
    std::ofstream out(output_path);
    if (!out.is_open()) return;

    out << "; F-Lite Three-Address Code\n\n";

    for (const auto& instr : tac) {
        switch (instr.op) {
            case TACOp::ADD:
                out << "    " << instr.result << " = " << instr.arg1 << " + " << instr.arg2 << "\n";
                break;
            case TACOp::SUB:
                out << "    " << instr.result << " = " << instr.arg1 << " - " << instr.arg2 << "\n";
                break;
            case TACOp::MUL:
                out << "    " << instr.result << " = " << instr.arg1 << " * " << instr.arg2 << "\n";
                break;
            case TACOp::DIV:
                out << "    " << instr.result << " = " << instr.arg1 << " / " << instr.arg2 << "\n";
                break;
            case TACOp::ASSIGN:
                out << "    " << instr.result << " = " << instr.arg1 << "\n";
                break;
            case TACOp::ARRAY_LOAD:
                out << "    " << instr.result << " = " << instr.arg1 << "[" << instr.arg2 << "]\n";
                break;
            case TACOp::ARRAY_STORE:
                out << "    " << instr.arg1 << "[" << instr.arg2 << "] = " << instr.result << "\n";
                break;
            case TACOp::IF_EQ:
                out << "    if " << instr.arg1 << " == " << instr.arg2 << " goto " << instr.result << "\n";
                break;
            case TACOp::IF_NE:
                out << "    if " << instr.arg1 << " != " << instr.arg2 << " goto " << instr.result << "\n";
                break;
            case TACOp::IF_LT:
                out << "    if " << instr.arg1 << " < " << instr.arg2 << " goto " << instr.result << "\n";
                break;
            case TACOp::IF_GT:
                out << "    if " << instr.arg1 << " > " << instr.arg2 << " goto " << instr.result << "\n";
                break;
            case TACOp::IF_LE:
                out << "    if " << instr.arg1 << " <= " << instr.arg2 << " goto " << instr.result << "\n";
                break;
            case TACOp::IF_GE:
                out << "    if " << instr.arg1 << " >= " << instr.arg2 << " goto " << instr.result << "\n";
                break;
            case TACOp::GOTO:
                out << "    goto " << instr.result << "\n";
                break;
            case TACOp::LABEL:
                out << instr.result << ":\n";
                break;
            case TACOp::PARAM:
                out << "    param " << instr.result << "\n";
                break;
            case TACOp::CALL:
                out << "    call " << instr.result << ", " << instr.arg1 << "\n";
                break;
            case TACOp::RETURN_OP:
                out << "    return\n";
                break;
            case TACOp::READ_OP:
                out << "    read " << instr.result << "\n";
                break;
            case TACOp::WRITE_OP:
                out << "    write " << instr.result << "\n";
                break;
            case TACOp::WRITE_STR:
                out << "    write \"" << instr.result << "\"\n";
                break;
            case TACOp::HALT:
                out << "    halt\n";
                break;
        }
    }

    out.close();
}

void Logger::write_asm(const std::string& output_path,
                        const std::vector<std::string>& asm_lines) {
    std::ofstream out(output_path);
    if (!out.is_open()) return;

    for (const auto& line : asm_lines) {
        out << line << "\n";
    }

    out.close();
}
