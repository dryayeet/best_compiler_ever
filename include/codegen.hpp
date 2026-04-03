#ifndef FLITE_CODEGEN_HPP
#define FLITE_CODEGEN_HPP

#include <string>
#include <vector>

enum class TACOp {
    ADD, SUB, MUL, DIV,
    ASSIGN,         // result = arg1
    ARRAY_LOAD,     // result = arg1[arg2]
    ARRAY_STORE,    // arg1[arg2] = result
    IF_EQ, IF_NE, IF_LT, IF_GT, IF_LE, IF_GE,  // conditional jump: if arg1 relop arg2 goto result
    GOTO,           // goto result
    LABEL,          // result:
    PARAM,          // param arg1
    CALL,           // call result, arg1 (arg1 = num params)
    RETURN_OP,
    READ_OP,        // read result
    WRITE_OP,       // write arg1
    WRITE_STR,      // write string literal arg1
    HALT
};

struct TACInstr {
    TACOp op;
    std::string result;
    std::string arg1;
    std::string arg2;

    TACInstr() : op(TACOp::HALT) {}
    TACInstr(TACOp o, const std::string& r, const std::string& a1 = "", const std::string& a2 = "")
        : op(o), result(r), arg1(a1), arg2(a2) {}
};

struct Diagnostic {
    int line;
    std::string message;

    Diagnostic() : line(0) {}
    Diagnostic(int l, const std::string& m) : line(l), message(m) {}
};

// Target code generation: TAC -> simplified assembly
class TargetCodeGen {
public:
    std::vector<std::string> generate(const std::vector<TACInstr>& tac);

private:
    std::string tac_op_name(TACOp op);
};

#endif // FLITE_CODEGEN_HPP
