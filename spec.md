Goal
- Build a JS tool that converts basic Java code into IB-syllabus-aligned pseudocode using the flow in `Flow chart for IA.png`.
- Accept Java source, normalize it, tokenize, build/validate an AST iteratively, then emit pseudocode via pre-order traversal.
- Reject inputs that are out of scope (e.g., OOP, 2D arrays, invalid syntax).

Success Criteria
- Handles covered constructs: variable declaration/assignment, arithmetic/relational/logical expressions, if/else, while/do-while/for loops, nested control flow, 1D arrays, simple methods limited to a single `main`-like entry (no classes beyond required wrapper), comments/whitespace.
- Explicitly fails with clear error messages for unsupported constructs (classes beyond wrapper, objects/OOP, interfaces, 2D arrays, exceptions, generics, lambdas, imports beyond `java.lang`, I/O beyond simple `System.out/Scanner`, switch, try/catch).
- Normalization/tokenization are deterministic and whitespace/formatting agnostic.
- AST builder detects syntax errors and stops on first fatal issue.
- Pseudocode output follows IB-style formatting (consistent casing, indentation, keywords) and reflects control structure accurately.
- Traversal is pre-order; output order matches AST visitation.
- Errors and outputs are well-structured and machine-testable.

Detailed TODOs
- Input & Validation
  - Accept Java source as string/file; strip BOM; enforce text encoding (UTF-8).
  - Pre-validate size limits; reject empty input; surface location-aware errors.
  - Add scope guard: scan for disallowed tokens/keywords (class definitions beyond main wrapper, `try`, `switch`, `new`, generics `< >`, arrays with `[][]`, etc.) and short-circuit with error.
- Normalization
  - Normalize line endings, tabs → spaces, collapse extraneous whitespace while preserving line/col mapping.
  - Remove/record comments (`//`, `/* */`) and strings; keep placeholders to preserve positions.
  - Normalize literals (e.g., unify boolean/int/float formats) and keyword casing (Java is fixed).
  - Produce a normalized source plus mapping back to original offsets for error reporting.
- Tokenization
  - Define token types for identifiers, literals, operators, punctuation, keywords, delimiters.
  - Implement DFA or regex-based tokenizer that emits token stream with line/col.
  - Handle operators precedence-aware token splitting (`==`, `!=`, `<=`, `>=`, `&&`, `||`, `++`, `--`, `+=`, etc.).
  - Emit lexical errors with location and reason; reject unsupported tokens.
- AST Construction (iterative as per flow)
  - Implement a recursive-descent or Pratt parser over the token stream, covering expressions and statements in the supported subset.
  - Enforce grammar rules for: declarations/assignments; if/else; while, do-while, for (basic form); blocks `{}`; simple `main` wrapper; 1D array declaration/access; nested control flow.
  - On encountering unsupported grammar, emit scoped error and halt.
  - Build AST nodes with typed kinds, children, and source spans; maintain parent links for traversal.
  - Repeat/advance node creation until stream is consumed; ensure synchronization on errors.
- AST Traversal & Pseudocode Generation
  - Implement pre-order traversal to walk nodes.
  - Map node kinds to IB-style pseudocode templates (e.g., `IF <cond> THEN`, `ELSE`, `END IF`; `FOR i FROM <start> TO <end> STEP <step>`; `WHILE <cond> DO`; assignments; declarations; array access).
  - Manage indentation levels and line breaks consistently; handle nested blocks.
  - Replace Java operators with pseudocode equivalents (`&&` → `AND`, `||` → `OR`, `!` → `NOT`, `==` → `=`, etc.).
  - Optionally emit comments collected during normalization if within scope; otherwise drop.
- Error Handling
  - Centralize error format: `{stage, message, line, column, snippet?}`.
  - Fail fast on out-of-scope constructs; provide actionable messages.
  - Ensure downstream stages do not run after a fatal error (per flow chart).
- Interfaces & I/O
  - Provide a simple API: `convert(javaSource: string): { pseudocode?: string, errors?: Error[] }`.
  - Add CLI wrapper (`node ./IA.js <file>`) for manual runs; print errors/pseudocode clearly.
- Non-goals / Out of Scope
  - OOP features (classes beyond minimal wrapper), methods beyond `main`, 2D arrays, switch, exceptions, generics, lambdas/streams, imports beyond defaults, complex I/O.

Test Plan
- Unit tests
  - Normalization: preserves positions, strips comments, normalizes whitespace.
  - Tokenizer: token sequences for representative snippets; errors on bad tokens.
  - Parser: builds AST for declarations, assignments, if/else, while/do-while/for, nested blocks, 1D array access; rejects out-of-scope constructs with correct errors.
  - Pseudocode generator: correct mapping for each node type; indentation and operator translation; traversal is pre-order.
- Integration tests
  - Happy paths: small programs covering each supported construct and nesting; mixed control flow; arrays.
  - Error cases: OOP usage, 2D array, switch, try/catch, unsupported operators, malformed syntax.
  - Formatting robustness: varied whitespace, comments, and line breaks.
- Golden files
  - Maintain fixture pairs of Java input → expected pseudocode; diff outputs in tests.
- CLI tests
  - Ensure exit codes: 0 on success, non-zero on error; stderr/stdout separation; clear messaging.

Assumptions / Open Points
- IB pseudocode dialect: assume standard IB DP style (IF/ELSE/END IF, WHILE DO/END WHILE, FOR FROM TO STEP, etc.). If a stricter format is required, specify keyword casing/line endings.
- Input likely wrapped in a single `class` with `main`; deeper class/method structures are treated as out of scope and should error.


1.	SC-01: The program must successfully convert basic Java constructs (variable declarations, assignments, arithmetic expressions, and boolean expressions) into the defined pseudocode format.

2.	SC-02: The program must correctly convert all conditional structures (if, else if, and else) into pseudocode with proper indentation and block structure.

3.	SC-03: The program must correctly convert iteration structures (for, while, and do-while) into pseudocode, preserving loop boundaries, conditions, and increment expressions.

4.	SC-04: The program must accurately convert array declarations, assignments, and element access into pseudocode using IB-style indexing notation.

5.	SC-05: The program must support 2D arrays, converting their declarations, nested loops, and element access into pseudocode.

6.	SC-06: The program must correctly translate Java operations involving ADT structures—stack, queue, list, and map—by mapping Java method calls (e.g., push(), enqueue(), add(), get()) to corresponding ADT operations in pseudocode.

7.	SC-07: The program must convert Java input and output (Scanner inputs and System.out.println) into clear pseudocode equivalents consistent with IB formatting conventions.

8.	SC-08: The program must handle code containing nested structures (e.g., loops inside loops, conditionals inside loops) and produce pseudocode that maintains the correct logical hierarchy.

9.	SC-09: The output pseudocode must follow a consistent and predefined style, including indentation, keywords (e.g., IF, THEN, END IF), and formatting rules chosen for the project.

10.	SC-10: The program must run entirely on the user’s local machine and must convert input code to pseudocode in under two seconds, ensuring fast processing without relying on an external server.
