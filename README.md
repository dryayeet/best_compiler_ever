# F-Lite Compiler

A compiler for F-Lite, a small language inspired by FORTRAN. Written from scratch in C++14 with no external tools or libraries (no Flex, no Bison, nothing).

## What It Does

- **Lexer (Scanner)**: Reads your source code character by character and breaks it into tokens. Handles case-insensitive keywords, FORTRAN-style operators like `.EQ.` and `.LT.`, strings in single quotes, and `!` comments.
- **Parser**: Takes the token stream and checks if your code follows the grammar rules. If something's wrong, it doesn't just stop at the first error; it recovers and keeps going so you see all the problems at once.
- **Smart Error Messages**: Uses two NLP techniques to give you actually helpful errors:
  - *Levenshtein Distance*: Figures out if you misspelled a keyword and suggests the right one ("Did you mean INTEGER?")
  - *Bigram Hinting*: Tells you what kind of token was expected based on what came before the error
- **Code Generation**: Produces Three-Address Code (a simple intermediate form) and then translates that into a basic assembly language.
- **Listing File**: Generates a `.lst` file that shows your source code with line numbers and any errors printed right below the line where they happened.

## The F-Lite Language

Here's what a program looks like:

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

You get integers, 1D arrays, IF/THEN/ELSE, DO loops, subroutines, READ/WRITE for I/O, `!` for comments, and comparison operators in both styles (`<`, `>=` or `.LT.`, `.GE.`).

## How to Build

You need `g++` with C++14 support (MinGW works fine).

```bash
# With make
mingw32-make

# Or just compile it directly
g++ -std=c++14 -Wall -Wextra -Iinclude -o flc.exe src/main.cpp src/scanner.cpp src/parser.cpp src/nlp_engine.cpp src/codegen.cpp src/logger.cpp
```

## How to Use

```bash
./flc.exe <source.fl>
```

This produces up to three output files:

| File | What it is | When it's generated |
|------|------------|---------------------|
| `.lst` | Listing file (your code + errors side by side) | Always |
| `.tac` | Three-Address Code (intermediate representation) | Only when there are no errors |
| `.asm` | Target assembly output | Only when there are no errors |

### Example: clean program

```
$ ./flc.exe tests/valid_program.fl
F-Lite Compiler v1.0
====================

Listing file: tests/valid_program.lst
TAC output:   tests/valid_program.tac
Assembly:     tests/valid_program.asm

Compilation SUCCESSFUL. No errors.
```

### Example: program with errors

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
src/
  main.cpp              Entry point, runs the whole pipeline
  scanner.cpp           The lexer, turns source code into tokens
  parser.cpp            Checks grammar, generates intermediate code
  nlp_engine.cpp        The "Did you mean?" and hint logic
  codegen.cpp           Turns intermediate code into assembly
  logger.cpp            Writes the .lst, .tac, and .asm files

include/
  token.hpp             Defines all the token types and keywords
  scanner.hpp           Scanner class header
  parser.hpp            Parser class header
  nlp_engine.hpp        NLP engine header
  symbol_table.hpp      Keeps track of declared variables
  codegen.hpp           Intermediate code structures
  logger.hpp            Logger class header

tests/
  valid_program.fl      A working test program
  error_program.fl      A broken program to test error reporting

docs/
  grammar.ebnf          The formal grammar definition
  report.md             Full project report
```

## How the Smart Errors Work

### Levenshtein Distance

When you type something that isn't a keyword, the compiler measures how many character edits (insert, delete, replace) it would take to turn your typo into each keyword. If it's close enough (2 edits or fewer), it suggests the correction.

| You typed | Suggestion | Edits needed |
|-----------|-----------|--------------|
| `INTGER` | `INTEGER` | 1 |
| `WRTE` | `WRITE` | 1 |
| `PROGRM` | `PROGRAM` | 1 |

### Bigram Hinting

The compiler knows what kinds of tokens usually come after each other (based on the grammar). So when something unexpected shows up, it can tell you what it was looking for:

> *Hint: after IDENTIFIER, typically '=', '(', ',', an operator, or newline follows.*

## Grammar

The full formal grammar is in [`docs/grammar.ebnf`](docs/grammar.ebnf). Here are the main rules:

```ebnf
program     = "PROGRAM" id NL body "END" "PROGRAM" id NL { subroutine }
if_stmt     = "IF" "(" expr rel_op expr ")" "THEN" NL body ["ELSE" NL body] "END" "IF" NL
do_stmt     = "DO" id "=" expr "," expr ["," expr] NL body "END" "DO" NL
expression  = term { ("+"|"-") term }
term        = factor { ("*"|"/") factor }
factor      = id ["(" expr ")"] | int_lit | "(" expr ")" | ("+"|"-") factor
```

## Full Report

The detailed project report (Abstract, Implementation, Results, NLP discussion) is at [`docs/report.md`](docs/report.md).
