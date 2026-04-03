# F-Lite Compiler

A compiler for F-Lite, a FORTRAN-inspired Domain Specific Language, built entirely in C++14 without Flex/Bison or any external dependencies.

## Features

- **Manual DFA-based Lexer** — case-insensitive tokenization, FORTRAN-style `.EQ.`/`.LT.` operators, apostrophe-delimited strings with escape sequences
- **Recursive Descent Parser** — full grammar coverage with panic-mode error recovery (reports multiple errors per run)
- **NLP-Enhanced Diagnostics** — Levenshtein Distance for "Did you mean?" keyword suggestions + Bigram Syntax Hinting for contextual error messages
- **Three-Address Code (TAC)** — intermediate representation with arithmetic, array access, control flow, and I/O
- **Target Code Generation** — simplified assembly output with register allocation
- **Listing Manager** — `.lst` files with line-numbered source and interleaved error messages

## F-Lite Language

```fortran
PROGRAM SUMARRAY
  INTEGER N, I, SUM
  INTEGER A(100)

  READ(N)
  DO I = 1, N
    READ(A(I))
  END DO

  SUM = 0
  DO I = 1, N
    SUM = SUM + A(I)
  END DO

  WRITE('Sum = ', SUM)
  STOP
END PROGRAM SUMARRAY
```

**Supports:** integers, 1D arrays, IF/THEN/ELSE, DO loops, subroutines, READ/WRITE I/O, `!` comments, and both symbolic (`<`, `>=`) and FORTRAN-style (`.LT.`, `.GE.`) relational operators.

## Build

Requires `g++` with C++14 support (MinGW or similar).

```bash
# Using make
mingw32-make

# Or manually
g++ -std=c++14 -Wall -Wextra -Iinclude -o flc.exe src/main.cpp src/scanner.cpp src/parser.cpp src/nlp_engine.cpp src/codegen.cpp src/logger.cpp
```

## Usage

```bash
./flc.exe <source.fl>
```

**Outputs:**

| File | Description | Generated |
|------|-------------|-----------|
| `.lst` | Listing file with source + interleaved errors | Always |
| `.tac` | Three-Address Code (intermediate) | Only if no errors |
| `.asm` | Target assembly | Only if no errors |

**Example — successful compilation:**
```
$ ./flc.exe tests/valid_program.fl
F-Lite Compiler v1.0
====================

Listing file: tests/valid_program.lst
TAC output:   tests/valid_program.tac
Assembly:     tests/valid_program.asm

Compilation SUCCESSFUL. No errors.
```

**Example — NLP error diagnostics:**
```
$ ./flc.exe tests/error_program.fl
F-Lite Compiler v1.0
====================

Listing file: tests/error_program.lst

Compilation FAILED with 6 error(s).
See listing file for details.
  unknown keyword 'INTGER' -- Did you mean 'INTEGER'?
  Error (line 5): expected ')', but found 'THEN'
     Hint: after IDENTIFIER, typically '=', '(', ',', an operator, or newline follows.
```

## Project Structure

```
├── src/
│   ├── main.cpp              # Entry point and pipeline orchestration
│   ├── scanner.cpp           # DFA-based lexical analyzer
│   ├── parser.cpp            # Recursive descent parser + TAC emission
│   ├── nlp_engine.cpp        # Levenshtein distance + bigram hinting
│   ├── codegen.cpp           # TAC -> target assembly translator
│   └── logger.cpp            # Listing/TAC/ASM file generation
├── include/
│   ├── token.hpp             # Token types, keyword map, helpers
│   ├── scanner.hpp           # Scanner class interface
│   ├── parser.hpp            # Parser class interface
│   ├── nlp_engine.hpp        # NLP engine interface
│   ├── symbol_table.hpp      # Symbol table (header-only)
│   ├── codegen.hpp           # TAC structures + code generator
│   └── logger.hpp            # Listing manager interface
├── tests/
│   ├── valid_program.fl      # Test: successful compilation
│   └── error_program.fl      # Test: NLP diagnostic output
├── docs/
│   ├── grammar.ebnf          # Formal F-Lite grammar
│   └── report.md             # Full project report
├── Makefile
└── README.md
```

## NLP Diagnostics

### Levenshtein Distance

Computes edit distance between unrecognized tokens and reserved keywords using a two-row DP optimization. Suggests the closest keyword when distance <= 2.

| Input | Suggestion | Distance |
|-------|-----------|----------|
| `INTGER` | `INTEGER` | 1 |
| `WRTE` | `WRITE` | 1 |
| `PROGRM` | `PROGRAM` | 1 |

### Bigram Syntax Hinting

A grammar-derived table maps each token type to a human-readable description of what typically follows, providing contextual hints like:

> *Hint: after IDENTIFIER, typically '=', '(', ',', an operator, or newline follows.*

## Grammar

See [`docs/grammar.ebnf`](docs/grammar.ebnf) for the complete formal grammar. Key constructs:

```ebnf
program     = "PROGRAM" id NL body "END" "PROGRAM" id NL { subroutine }
if_stmt     = "IF" "(" expr rel_op expr ")" "THEN" NL body ["ELSE" NL body] "END" "IF" NL
do_stmt     = "DO" id "=" expr "," expr ["," expr] NL body "END" "DO" NL
expression  = term { ("+"|"-") term }
term        = factor { ("*"|"/") factor }
factor      = id ["(" expr ")"] | int_lit | "(" expr ")" | ("+"|"-") factor
```

## Documentation

The full project report covering Abstract, Implementation, Results, and NLP Novelty Discussion is at [`docs/report.md`](docs/report.md).
