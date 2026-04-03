$(function () {

    // --- State ---
    let result = null;       // compile() output
    let currentPhase = 0;    // 0=source, 1=tokens, 2=parser, 3=tac, 4=asm
    let sourceCode = '';     // preserved editor content

    const EXAMPLE_CODE =
`PROGRAM SUMARRAY
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
END PROGRAM SUMARRAY`;

    const EXPLANATIONS = [
        '<strong>Source Code</strong> &#8212; This is your F-Lite program. Edit it, then click <strong>Compile</strong> to see how the compiler processes it step by step.',
        '<strong>Step 1: Lexical Analysis</strong> &#8212; The scanner reads your code character by character and breaks it into <strong>tokens</strong>: keywords, identifiers, numbers, operators, and so on. Each token is tagged with a type and its position in the source.',
        '<strong>Step 2: Parsing + NLP Diagnostics</strong> &#8212; The parser reads the token stream and checks if your code follows the grammar rules. If something is wrong, it uses <strong>Levenshtein Distance</strong> to suggest misspelled keywords and <strong>Bigram Analysis</strong> to hint at what was expected.',
        '<strong>Step 3: Three-Address Code</strong> &#8212; The compiler translates your program into a simple intermediate form where each instruction has at most three parts (like <code>t0 = X + Y</code>). This is easier to optimize and translate than raw source.',
        '<strong>Step 4: Target Assembly</strong> &#8212; The intermediate code is turned into assembly instructions: LOAD, STORE, ADD, CMP, JMP, etc. This is what a real CPU would execute.'
    ];

    // --- Init ---
    sourceCode = EXAMPLE_CODE;
    $('#source-editor').val(EXAMPLE_CODE);
    updateLineNumbers();
    showPhase(0);

    // --- Events ---
    $('#source-editor').on('input scroll', updateLineNumbers);
    $('#source-editor').on('scroll', function () {
        $('.line-numbers').scrollTop(this.scrollTop);
    });

    // Tab key in editor
    $('#source-editor').on('keydown', function (e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            $(this).val($(this).val().substring(0, start) + '  ' + $(this).val().substring(end));
            this.selectionStart = this.selectionEnd = start + 2;
        }
    });

    $('#btn-compile').on('click', doCompile);
    $('#btn-prev').on('click', function () { if (currentPhase > 0) showPhase(currentPhase - 1); });
    $('#btn-next').on('click', function () { if (currentPhase < 4) showPhase(currentPhase + 1); });

    $('.phase-tab').on('click', function () {
        const phase = parseInt($(this).data('phase'));
        if (phase === 0 || result) showPhase(phase);
    });

    // Keyboard navigation
    $(document).on('keydown', function (e) {
        if ($(e.target).is('textarea')) return;
        if (e.key === 'ArrowLeft') { if (currentPhase > 0) showPhase(currentPhase - 1); }
        if (e.key === 'ArrowRight') { if (currentPhase < 4 && result) showPhase(currentPhase + 1); }
    });

    // --- Functions ---

    function updateLineNumbers() {
        const editor = $('#source-editor');
        if (!editor.length) return;
        sourceCode = editor.val(); // keep state in sync
        const lines = sourceCode.split('\n');
        const html = lines.map((_, i) => '<div>' + (i + 1) + '</div>').join('');
        $('.line-numbers').html(html);
    }

    function doCompile() {
        // Save editor content before compiling
        if ($('#source-editor').length) sourceCode = $('#source-editor').val();
        const source = sourceCode;
        if (!source.trim()) return;

        result = compile(source);

        // Mark tabs as available
        $('.phase-tab').removeClass('done');
        for (let i = 0; i <= 4; i++) {
            if (i <= (result.success ? 4 : 2)) {
                $(`.phase-tab[data-phase="${i}"]`).addClass('done');
            }
        }

        showPhase(1); // jump to tokens
    }

    function showPhase(phase) {
        currentPhase = phase;

        // Update tabs
        $('.phase-tab').removeClass('active');
        $(`.phase-tab[data-phase="${phase}"]`).addClass('active');

        // Update nav buttons
        $('#btn-prev').prop('disabled', phase === 0);
        $('#btn-next').prop('disabled', phase === 4 || (!result && phase === 0));

        // Update explanation
        $('#explanation').html(EXPLANATIONS[phase]);

        // Update panels
        if (phase === 0) {
            showSourceEditor();
        } else {
            showSourceReadonly(phase);
            renderRightPanel(phase);
        }
    }

    function showSourceEditor() {
        // Save content from editor if it's still in DOM
        if ($('#source-editor').length) sourceCode = $('#source-editor').val();
        const code = sourceCode || EXAMPLE_CODE;

        $('#left-panel .panel-body').html(
            '<div class="editor-wrap">' +
            '<div class="line-numbers"></div>' +
            '<textarea id="source-editor" spellcheck="false">' + escHtml(code) + '</textarea>' +
            '</div>'
        );
        // Rebind
        $('#source-editor').on('input scroll', updateLineNumbers);
        $('#source-editor').on('scroll', function () { $('.line-numbers').scrollTop(this.scrollTop); });
        $('#source-editor').on('keydown', function (e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                $(this).val($(this).val().substring(0, start) + '  ' + $(this).val().substring(end));
                this.selectionStart = this.selectionEnd = start + 2;
            }
        });
        updateLineNumbers();

        // Right panel: welcome
        $('#right-panel .panel-body').html(
            '<div class="welcome-panel">' +
            '<h2>F-Lite Compiler Explorer</h2>' +
            '<p>Write your code on the left and click <strong>Compile</strong> to watch each phase of the compiler in action.</p>' +
            '<div class="arrow-hint">&#8592;</div>' +
            '</div>'
        );
        $('#left-panel .panel-header').text('Source Code');
        $('#right-panel .panel-header').text('Output');
    }

    function showSourceReadonly(phase) {
        if (!result) return;

        const errorLines = {};
        if (phase === 2) {
            result.errors.forEach(e => { errorLines[e.line] = true; });
        }

        // Build token map for phase 1 highlighting
        let tokensByLine = {};
        if (phase === 1) {
            result.tokens.forEach(tok => {
                if (tok.type === TokenType.NEWLINE || tok.type === TokenType.END_OF_FILE) return;
                if (!tokensByLine[tok.line]) tokensByLine[tok.line] = [];
                tokensByLine[tok.line].push(tok);
            });
        }

        let html = '<div class="source-display">';
        result.sourceLines.forEach((line, i) => {
            const lineNum = i + 1;
            const isError = errorLines[lineNum];
            const cls = isError ? 'source-line error-line' : 'source-line';

            html += '<div class="' + cls + '">';
            html += '<span class="line-num">' + lineNum + '</span>';

            if (phase === 1 && tokensByLine[lineNum]) {
                html += '<span class="line-content">' + highlightTokensInLine(line, tokensByLine[lineNum]) + '</span>';
            } else {
                html += '<span class="line-content">' + escHtml(line) + '</span>';
            }
            html += '</div>';
        });
        html += '</div>';

        $('#left-panel .panel-body').html(html);
        $('#left-panel .panel-header').text('Source Code');
    }

    function highlightTokensInLine(line, tokens) {
        // Sort tokens by column
        tokens.sort((a, b) => a.col - b.col);

        let result = '';
        let pos = 0;

        for (const tok of tokens) {
            const start = tok.col - 1;
            // Add any gap before this token as plain text
            if (start > pos) {
                result += escHtml(line.substring(pos, start));
            }

            const cat = tokenCategory(tok.type);
            const len = tok.type === TokenType.STRING_LIT
                ? findStringLength(line, start)
                : tok.lexeme.length;
            const text = line.substring(start, start + len);
            result += '<span class="tok-' + cat + '">' + escHtml(text) + '</span>';
            pos = start + len;
        }

        // Trailing text (comments, whitespace)
        if (pos < line.length) {
            const rest = line.substring(pos);
            // Check for comment
            const bangIdx = rest.indexOf('!');
            if (bangIdx !== -1) {
                result += escHtml(rest.substring(0, bangIdx));
                result += '<span class="tok-comment">' + escHtml(rest.substring(bangIdx)) + '</span>';
            } else {
                result += escHtml(rest);
            }
        }

        return result;
    }

    function findStringLength(line, start) {
        // Find the string literal including quotes
        if (line[start] !== "'") return 1;
        let i = start + 1;
        while (i < line.length) {
            if (line[i] === '\\') { i += 2; continue; }
            if (line[i] === "'") return i - start + 1;
            i++;
        }
        return line.length - start; // unterminated
    }

    function renderRightPanel(phase) {
        if (!result) return;
        switch (phase) {
            case 1: renderTokens(); break;
            case 2: renderParser(); break;
            case 3: renderTAC(); break;
            case 4: renderAssembly(); break;
        }
    }

    // --- Phase 1: Tokens ---
    function renderTokens() {
        const visibleTokens = result.tokens.filter(t =>
            t.type !== TokenType.NEWLINE && t.type !== TokenType.END_OF_FILE
        );

        let html = '<table class="token-table"><thead><tr>';
        html += '<th>#</th><th>Type</th><th>Lexeme</th><th>Line</th><th>Col</th>';
        html += '</tr></thead><tbody>';

        visibleTokens.forEach((tok, i) => {
            const cat = tokenCategory(tok.type);
            html += '<tr>';
            html += '<td style="color:#484f58">' + (i + 1) + '</td>';
            html += '<td><span class="token-badge badge-' + cat + '">' + tok.type + '</span></td>';
            html += '<td style="color:#e6edf3; font-weight:500">' + escHtml(tok.lexeme) + '</td>';
            html += '<td style="color:#8b949e">' + tok.line + '</td>';
            html += '<td style="color:#8b949e">' + tok.col + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';

        $('#right-panel .panel-body').html(html);
        $('#right-panel .panel-header').text('Token Stream (' + visibleTokens.length + ' tokens)');
    }

    // --- Phase 2: Parser + NLP ---
    function renderParser() {
        let html = '';

        if (result.success) {
            html += '<div class="error-card success">';
            html += '<div class="error-card-header success-header">&#10003; Parse Successful</div>';
            html += '<div class="error-item">Your program follows all grammar rules. No errors found. The compiler can proceed to code generation.</div>';
            html += '</div>';
        } else {
            html += '<div class="error-card">';
            html += '<div class="error-card-header error-header">&#10007; ' + result.errors.length + ' Error(s) Found</div>';

            result.errors.forEach(err => {
                html += '<div class="error-item">';
                html += '<span class="error-line-num">Line ' + err.line + '</span>';

                // Parse the error message for Did you mean and Hint parts
                let msg = err.message;
                const hintIdx = msg.indexOf('\n     Hint:');
                let hint = '';
                if (hintIdx !== -1) {
                    hint = msg.substring(hintIdx + 1).trim();
                    msg = msg.substring(0, hintIdx);
                }

                // Highlight "Did you mean" part
                const dymMatch = msg.match(/-- Did you mean '(\w+)'\?/);
                if (dymMatch) {
                    const before = msg.substring(0, msg.indexOf('-- Did you mean'));
                    html += '<span class="error-msg">' + escHtml(before) + '</span>';
                    html += '<span class="error-suggestion">Did you mean \'' + dymMatch[1] + '\'?</span>';

                    // Levenshtein visualization
                    const fromWord = msg.match(/keyword '(\w+)'/) || msg.match(/'(\w+)'/);
                    if (fromWord) {
                        const dist = NLPEngine.levenshtein(fromWord[1].toUpperCase(), dymMatch[1]);
                        html += '<div class="lev-viz">';
                        html += '<span class="lev-word lev-from">' + escHtml(fromWord[1]) + '</span>';
                        html += '<span class="lev-arrow">&#8594;</span>';
                        html += '<span class="lev-word lev-to">' + escHtml(dymMatch[1]) + '</span>';
                        html += '<span class="lev-dist">' + dist + ' edit' + (dist !== 1 ? 's' : '') + '</span>';
                        html += '</div>';
                    }
                } else {
                    html += '<span class="error-msg">' + escHtml(msg) + '</span>';
                }

                if (hint) {
                    html += '<span class="error-hint">' + escHtml(hint) + '</span>';
                }

                html += '</div>';
            });

            html += '</div>';
        }

        $('#right-panel .panel-body').html(html);
        $('#right-panel .panel-header').text('Parse Results');
    }

    // --- Phase 3: TAC ---
    function renderTAC() {
        if (!result.success) {
            $('#right-panel .panel-body').html(
                '<div class="welcome-panel"><h2>No TAC Generated</h2><p>Code generation is skipped when there are parse errors. Fix the errors first.</p></div>'
            );
            $('#right-panel .panel-header').text('Three-Address Code');
            return;
        }

        let html = '<div class="code-display">';
        result.tac.forEach(instr => {
            const text = formatTAC(instr);
            let cls = '';

            if (instr.op === TACOp.LABEL) cls = 'tac-label';
            else if (instr.op === TACOp.GOTO) cls = 'tac-goto';
            else if (instr.op.startsWith('IF_')) cls = 'tac-goto';
            else if (instr.op === TACOp.READ || instr.op === TACOp.WRITE || instr.op === TACOp.WRITE_STR) cls = 'tac-io';
            else if (instr.op === TACOp.HALT) cls = 'tac-halt';
            else if (instr.op === TACOp.ASSIGN) cls = 'tac-assign';
            else cls = 'tac-op';

            const indent = instr.op === TACOp.LABEL ? '' : '    ';
            html += '<div class="code-line ' + cls + '">' + indent + escHtml(text) + '</div>';
        });
        html += '</div>';

        $('#right-panel .panel-body').html(html);
        $('#right-panel .panel-header').text('Three-Address Code (' + result.tac.length + ' instructions)');
    }

    // --- Phase 4: Assembly ---
    function renderAssembly() {
        if (!result.success) {
            $('#right-panel .panel-body').html(
                '<div class="welcome-panel"><h2>No Assembly Generated</h2><p>Code generation is skipped when there are parse errors. Fix the errors first.</p></div>'
            );
            $('#right-panel .panel-header').text('Target Assembly');
            return;
        }

        let html = '<div class="code-display">';
        result.assembly.forEach(line => {
            let cls = '';
            const trimmed = line.trim();

            if (trimmed.startsWith(';')) cls = 'asm-comment';
            else if (trimmed.endsWith(':')) cls = 'asm-label';
            else if (trimmed.startsWith('LOAD') || trimmed.startsWith('LOADI')) cls = 'asm-load';
            else if (trimmed.startsWith('STORE')) cls = 'asm-store';
            else if (trimmed.startsWith('ADD') || trimmed.startsWith('SUB') ||
                     trimmed.startsWith('MUL') || trimmed.startsWith('DIV') ||
                     trimmed.startsWith('CMP')) cls = 'asm-arith';
            else if (trimmed.startsWith('J') || trimmed.startsWith('CALL') ||
                     trimmed.startsWith('RET') || trimmed.startsWith('PUSH')) cls = 'asm-jump';
            else if (trimmed.startsWith('READ') || trimmed.startsWith('WRITE')) cls = 'asm-io';
            else if (trimmed === 'HALT') cls = 'asm-halt';

            html += '<div class="code-line ' + cls + '">' + escHtml(line) + '</div>';
        });
        html += '</div>';

        $('#right-panel .panel-body').html(html);
        $('#right-panel .panel-header').text('Target Assembly (' + result.assembly.length + ' lines)');
    }

    // --- Helpers ---
    function escHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

});
