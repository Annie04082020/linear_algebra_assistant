// Math Utility: Fraction class handles precise rational number arithmetic
class Fraction {
    constructor(num, den = 1) {
        if (den === 0) throw new Error("Denominator cannot be zero.");
        let a = Math.round(num);
        let b = Math.round(den);
        if (b < 0) {
            a = -a;
            b = -b;
        }
        let g = this.gcd(Math.abs(a), Math.abs(b));
        this.n = a / g;
        this.d = b / g;
    }

    gcd(a, b) {
        return b === 0 ? a : this.gcd(b, a % b);
    }

    static parse(str) {
        str = str.toString().trim();
        if (str === "") return new Fraction(0, 1);
        
        // Handle negative signs correctly
        let sign = 1;
        if (str.startsWith("-")) {
            sign = -1;
            str = str.substring(1);
        } else if (str.startsWith("+")) {
            str = str.substring(1);
        }

        // Handle fractions (e.g., 3/4)
        if (str.includes("/")) {
            let parts = str.split("/");
            if (parts.length !== 2) throw new Error("Invalid fraction format.");
            let n = parseInt(parts[0], 10);
            let d = parseInt(parts[1], 10);
            if (isNaN(n) || isNaN(d)) throw new Error("Invalid fraction components.");
            return new Fraction(n * sign, d);
        }

        // Handle decimals (e.g., 0.5)
        if (str.includes(".")) {
            let parts = str.split(".");
            let decimalLength = parts[1] ? parts[1].length : 0;
            let denominator = Math.pow(10, decimalLength);
            let numerator = parseInt(str.replace(".", ""), 10);
            return new Fraction(numerator * sign, denominator);
        }

        // Handle integers
        let n = parseInt(str, 10);
        if (isNaN(n)) throw new Error("Invalid number.");
        return new Fraction(n * sign, 1);
    }

    add(other) {
        return new Fraction(this.n * other.d + other.n * this.d, this.d * other.d);
    }

    sub(other) {
        return new Fraction(this.n * other.d - other.n * this.d, this.d * other.d);
    }

    mult(other) {
        return new Fraction(this.n * other.n, this.d * other.d);
    }

    div(other) {
        if (other.n === 0) throw new Error("Division by zero.");
        return new Fraction(this.n * other.d, this.d * other.n);
    }

    equals(other) {
        return this.n === other.n && this.d === other.d;
    }

    isZero() {
        return this.n === 0;
    }

    toString() {
        return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`;
    }

    toLatex() {
        if (this.d === 1) return `${this.n}`;
        if (this.n < 0) return `-\\frac{${-this.n}}{${this.d}}`;
        return `\\frac{${this.n}}{${this.d}}`;
    }
}

// Global State
let matrixRows = 3;
let matrixCols = 4;
let historyStates = [];
let initialMatrixState = null;

// DOM Elements
const btnGenerate = document.getElementById("btn-generate");
const inputsContainer = document.getElementById("matrix-inputs");
const btnApply = document.getElementById("btn-apply");
const btnHint = document.getElementById("btn-hint");
const btnReset = document.getElementById("btn-reset");
const btnClear = document.getElementById("btn-clear");
const historyList = document.getElementById("history-list");
const hintDisplay = document.getElementById("hint-display");
const hintText = document.getElementById("hint-text");

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
    generateGrid();
    setupOperationInputs();
    
    // Render initial static math formulas in UI
    if (window.renderMathInElement) {
        renderMathInElement(document.body, {
            delimiters: [
                {left: "$$", right: "$$", display: true},
                {left: "$", right: "$", display: false}
            ]
        });
    }
});

// Math parser logic
function parseOperation(rawStr) {
    let str = rawStr.replace(/[\s\(\)\[\]]+/g, '').toUpperCase();
    if (!str) return null;

    let mSwap = str.match(/^R(\d+)<->R(\d+)$/);
    if (mSwap) return { type: 'swap', r1: parseInt(mSwap[1], 10), r2: parseInt(mSwap[2], 10) };

    let targetStr, exprStr;
    let isImplicitScale = false;

    if (str.includes('->')) {
        let parts = str.split('->'); exprStr = parts[0]; targetStr = parts[1];
    } else if (str.includes('=')) {
        let parts = str.split('='); targetStr = parts[0]; exprStr = parts[1];
    } else {
        exprStr = str;
        isImplicitScale = true;
    }

    let explicitTarget = null;
    if (!isImplicitScale) {
        let mTarget = targetStr.match(/^R(\d+)$/);
        if (!mTarget) return null;
        explicitTarget = parseInt(mTarget[1], 10);
    }

    let safeExpr = exprStr
        .replace(/\*-/g, '_MN_')
        .replace(/\*\+/g, '_MP_')
        .replace(/\/-/g, '_DN_')
        .replace(/\/\+/g, '_DP_');
        
    let safeTerms = safeExpr.match(/(?:^|[\+\-])[^\+\-]+/g);
    if (!safeTerms) return null;
    
    let terms = safeTerms.map(t => t
        .replace(/_MN_/g, '*-')
        .replace(/_MP_/g, '*+')
        .replace(/_DN_/g, '/-')
        .replace(/_DP_/g, '/+')
    );

    let rowCoeffs = new Map();

    for (let term of terms) {
        let mR = term.match(/R(\d+)/);
        if (!mR) return null; // Invalid term: no R
        let rIndex = parseInt(mR[1], 10);

        let coeffStr = term.replace(/R\d+/, '').replace(/\*/g, '');

        if (coeffStr === '' || coeffStr === '+') coeffStr = '1';
        else if (coeffStr === '-') coeffStr = '-1';
        else if (coeffStr.startsWith('/')) coeffStr = '1' + coeffStr;
        else if (coeffStr.startsWith('-/')) coeffStr = '-1' + coeffStr.substring(1);
        else if (coeffStr.startsWith('+/')) coeffStr = '1' + coeffStr.substring(1);
        
        let coeff;
        try { coeff = Fraction.parse(coeffStr); } catch(e) { return null; }

        if (rowCoeffs.has(rIndex)) {
            rowCoeffs.set(rIndex, rowCoeffs.get(rIndex).add(coeff));
        } else {
            rowCoeffs.set(rIndex, coeff);
        }
    }

    if (isImplicitScale) {
        if (rowCoeffs.size !== 1) return null; // Only implicit scaling is allowed without arrow
        let target = Array.from(rowCoeffs.keys())[0];
        let coeff = rowCoeffs.get(target);
        if (coeff.isZero()) return null;
        return { type: 'multiply', r: target, scalar: coeff };
    } else {
        let targetCoeff = rowCoeffs.get(explicitTarget) || new Fraction(0, 1);
        rowCoeffs.delete(explicitTarget);

        if (rowCoeffs.size === 0) {
            if (targetCoeff.isZero()) return null;
            return { type: 'multiply', r: explicitTarget, scalar: targetCoeff };
        } else if (rowCoeffs.size === 1) {
            if (!targetCoeff.equals(new Fraction(1, 1))) return null;
            let source = Array.from(rowCoeffs.keys())[0];
            let sourceCoeff = rowCoeffs.get(source);
            if (sourceCoeff.isZero()) return null;
            return { type: 'add', rTarget: explicitTarget, rSource: source, scalar: sourceCoeff };
        } else {
            return null; // Invalid operation type or too many terms
        }
    }
}

function opToEnglish(op) {
    if (!op) return "";
    if (op.type === 'swap') return `Swap R${op.r1} and R${op.r2}`;
    if (op.type === 'multiply') return `Multiply R${op.r} by ${op.scalar.toString()}`;
    if (op.type === 'add') return `Add (${op.scalar.toString()}) * R${op.rSource} to R${op.rTarget}`;
}

function opToMath(op) {
    if (!op) return "";
    if (op.type === 'swap') return `$R_${op.r1} \\leftrightarrow R_${op.r2}$`;
    if (op.type === 'multiply') return `$R_${op.r} \\leftarrow ${op.scalar.toString()} \\cdot R_${op.r}$`;
    if (op.type === 'add') return `$R_${op.rTarget} \\leftarrow R_${op.rTarget} + (${op.scalar.toString()}) \\cdot R_${op.rSource}$`;
}

function createOpRow(val = "") {
    const opList = document.getElementById("operations-list");
    const div = document.createElement("div");
    div.className = "op-input-row";
    div.style.cssText = "margin-bottom: 0;";
    div.innerHTML = `
        <div style="display: flex; gap: 0.5rem; align-items: center;">
            <input type="text" class="op-math-input" placeholder="e.g. R2 - 2R1 -> R2" style="flex: 1; font-family: 'JetBrains Mono', monospace;" value="${val}">
            <button class="btn-remove-op" style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 1.5rem; padding: 0 0.5rem;">&times;</button>
        </div>
        <div class="op-translation" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; min-height: 1rem; line-height: 1rem;"></div>
    `;

    const input = div.querySelector(".op-math-input");
    const translation = div.querySelector(".op-translation");
    const removeBtn = div.querySelector(".btn-remove-op");

    input.addEventListener("input", () => {
        let op = parseOperation(input.value);
        if (op && op.type === 'swap' && (op.r1 > matrixRows || op.r2 > matrixRows)) op = null;
        if (op && op.type === 'multiply' && (op.r > matrixRows)) op = null; 
        if (op && op.type === 'add' && (op.rTarget > matrixRows || op.rSource > matrixRows)) op = null;
        
        if (op) {
             translation.innerText = opToEnglish(op);
             translation.style.color = "var(--success)";
        } else {
             translation.innerText = input.value ? "Invalid format" : "";
             translation.style.color = "var(--danger)";
        }
    });

    removeBtn.addEventListener("click", () => {
        if (opList.children.length > 1) div.remove();
        else { input.value = ""; input.dispatchEvent(new Event("input")); }
    });

    opList.appendChild(div);
    if(val) input.dispatchEvent(new Event("input"));
}

function setupOperationInputs() {
    createOpRow();
    document.getElementById("btn-add-op").addEventListener("click", () => createOpRow());
}

function generateGrid() {
    matrixRows = parseInt(document.getElementById("rows").value, 10);
    matrixCols = parseInt(document.getElementById("cols").value, 10);
    
    const mainGrid = document.querySelector('.main-grid');
    if (matrixCols >= 7) {
        mainGrid.classList.add('large-matrix');
    } else {
        mainGrid.classList.remove('large-matrix');
    }

    if (matrixRows < 1 || matrixCols < 1) {
        alert("Dimensions must be positive.");
        return;
    }

    inputsContainer.style.gridTemplateColumns = `repeat(${matrixCols}, minmax(60px, auto))`;
    inputsContainer.innerHTML = "";

    for (let r = 0; r < matrixRows; r++) {
        for (let c = 0; c < matrixCols; c++) {
            let container = document.createElement("div");
            container.className = "matrix-cell-container";
            container.dataset.r = r;
            container.dataset.c = c;

            let display = document.createElement("div");
            display.className = "matrix-cell-display";
            
            let input = document.createElement("input");
            input.type = "text";
            input.className = "matrix-cell matrix-cell-input";
            input.dataset.r = r;
            input.dataset.c = c;
            input.value = "0";
            input.style.display = "none";

            const updateMath = () => {
                let val = "0";
                try { val = Fraction.parse(input.value).toLatex(); } catch(e) { val = input.value; }
                display.innerHTML = `$ \\displaystyle ${val} $`;
                if (window.renderMathInElement) {
                    renderMathInElement(display, { delimiters: [{left: "$", right: "$", display: false}] });
                }
            };
            updateMath();

            container.addEventListener("click", () => {
                if (input.style.display === "none") {
                    display.style.display = "none";
                    input.style.display = "block";
                    input.focus();
                }
            });

            input.addEventListener('blur', () => {
                display.style.display = "flex";
                input.style.display = "none";
                updateMath();
            });

            input.addEventListener('focus', function() { this.select(); });
            input.addEventListener('keydown', handleKeyNavigation);
            input.addEventListener('paste', handlePaste);

            container.appendChild(display);
            container.appendChild(input);
            inputsContainer.appendChild(container);
        }
    }
    
    historyStates = [];
    initialMatrixState = null;
    renderHistory();
    hideHint();
}

btnGenerate.addEventListener("click", () => {
    if (confirm("Generating a new matrix will clear history. Proceed?")) {
        generateGrid();
    }
});

btnReset.addEventListener("click", () => {
    if (initialMatrixState) {
        setMatrixToUI(initialMatrixState);
        historyStates = [];
        renderHistory();
        hideHint();
    } else {
        alert("The matrix is already at its initial state. Use 'Clear' if you want to zero all values.");
    }
});

btnClear.addEventListener("click", () => {
    const cells = document.querySelectorAll(".matrix-cell");
    cells.forEach(c => {
        c.value = "0";
        c.dispatchEvent(new Event("blur"));
    });
    historyStates = [];
    initialMatrixState = null;
    renderHistory();
    hideHint();
});

// Read current matrix state from inputs
function getCurrentMatrix() {
    let m = [];
    const inputs = document.querySelectorAll(".matrix-cell");
    if (inputs.length !== matrixRows * matrixCols) return null; // Defensive check

    try {
        for (let r = 0; r < matrixRows; r++) {
            let rowObj = [];
            for (let c = 0; c < matrixCols; c++) {
                let val = inputs[r * matrixCols + c].value;
                rowObj.push(Fraction.parse(val));
            }
            m.push(rowObj);
        }
        return m;
    } catch (e) {
        alert("Invalid input detected! Please enter valid numbers or fractions (e.g. 1/2).");
        return null;
    }
}

// Display matrix onto UI inputs
function setMatrixToUI(m) {
    const inputs = document.querySelectorAll(".matrix-cell");
    for (let r = 0; r < matrixRows; r++) {
        for (let c = 0; c < matrixCols; c++) {
            inputs[r * matrixCols + c].value = m[r][c].toString();
            inputs[r * matrixCols + c].dispatchEvent(new Event("blur"));
        }
    }
}

// Apply Selected Operation
btnApply.addEventListener("click", () => {
    const matrix = getCurrentMatrix();
    if (!matrix) return;

    if (historyStates.length === 0) {
        initialMatrixState = matrix.map(row => [...row]); // Deep copy outer array
    }

    const inputs = document.querySelectorAll(".op-math-input");
    let ops = [];
    for (let inp of inputs) {
        if (!inp.value.trim()) continue;
        let op = parseOperation(inp.value);
        if (!op) { alert(`Invalid operation format: ${inp.value}`); return; }
        ops.push(op);
    }
    if (ops.length === 0) { alert("Please input at least one operation."); return; }

    let newMatrix = matrix.map(row => [...row]);
    let mathDescs = [];
    
    for (let op of ops) {
        try {
            if (op.type === "swap") {
                if (op.r1 < 1 || op.r1 > matrixRows || op.r2 < 1 || op.r2 > matrixRows) throw new Error("Row out of bounds");
                let temp = newMatrix[op.r1 - 1];
                newMatrix[op.r1 - 1] = newMatrix[op.r2 - 1];
                newMatrix[op.r2 - 1] = temp;
            } else if (op.type === "multiply") {
                if (op.r < 1 || op.r > matrixRows) throw new Error("Row out of bounds");
                for (let c = 0; c < matrixCols; c++) {
                    newMatrix[op.r - 1][c] = newMatrix[op.r - 1][c].mult(op.scalar);
                }
            } else if (op.type === "add") {
                if (op.rTarget < 1 || op.rTarget > matrixRows || op.rSource < 1 || op.rSource > matrixRows) throw new Error("Row out of bounds");
                for (let c = 0; c < matrixCols; c++) {
                    let addition = newMatrix[op.rSource - 1][c].mult(op.scalar);
                    newMatrix[op.rTarget - 1][c] = newMatrix[op.rTarget - 1][c].add(addition);
                }
            }
            mathDescs.push(opToMath(op));
        } catch(e) {
            alert(`Error applying operation: ${e.message}`);
            return;
        }
    }

    setMatrixToUI(newMatrix);
    addHistory(mathDescs.join("<br>"), newMatrix);
    hideHint();
    
    // Reset OP inputs
    document.getElementById("operations-list").innerHTML = "";
    createOpRow();
});

// Render history
function addHistory(desc, matrix) {
    historyStates.unshift({ desc, matrix });
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = "";
    if (historyStates.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No operations applied yet.</div>';
        return;
    }

    historyStates.forEach((state, idx) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'history-step';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'history-title';
        titleDiv.innerHTML = `<span>Step ${historyStates.length - idx}: ${state.desc}</span> <span class="toggle-icon">${idx === 0 ? '▼' : '▶'}</span>`;
        stepDiv.appendChild(titleDiv);

        const matrixGrid = document.createElement('div');
        matrixGrid.className = 'history-matrix';
        matrixGrid.style.gridTemplateColumns = `repeat(${matrixCols}, minmax(45px, auto))`;
        matrixGrid.style.justifyContent = 'center';
        
        if (idx !== 0) {
            matrixGrid.style.display = 'none';
        }

        titleDiv.addEventListener('click', () => {
            if (matrixGrid.style.display === 'none') {
                matrixGrid.style.display = 'grid';
                titleDiv.querySelector('.toggle-icon').innerText = '▼';
            } else {
                matrixGrid.style.display = 'none';
                titleDiv.querySelector('.toggle-icon').innerText = '▶';
            }
        });

        for (let r = 0; r < matrixRows; r++) {
            for (let c = 0; c < matrixCols; c++) {
                const cell = document.createElement('div');
                cell.innerHTML = `$ \\displaystyle ${state.matrix[r][c].toLatex()} $`;
                matrixGrid.appendChild(cell);
            }
        }

        stepDiv.appendChild(matrixGrid);
        historyList.appendChild(stepDiv);
    });

    // Render newly added LaTeX math representations
    if (window.renderMathInElement) {
        renderMathInElement(historyList, {
            delimiters: [
                {left: "$$", right: "$$", display: true},
                {left: "$", right: "$", display: false}
            ]
        });
    }
}

// Intuitive Input Handlers
function handleKeyNavigation(e) {
    const r = parseInt(this.dataset.r, 10);
    const c = parseInt(this.dataset.c, 10);
    
    if (e.key === "Enter") {
        e.preventDefault();
        let targetR = r;
        let targetC = c + (e.shiftKey ? -1 : 1);
        
        if (targetC >= matrixCols) {
            targetC = 0;
            targetR++;
        } else if (targetC < 0) {
            targetC = matrixCols - 1;
            targetR--;
        }

        if (targetR >= 0 && targetR < matrixRows) {
            const targetInput = document.querySelector(`.matrix-cell[data-r="${targetR}"][data-c="${targetC}"]`);
            if (targetInput) targetInput.parentElement.click();
        } else if (targetR >= matrixRows && !e.shiftKey) { 
             document.getElementById('btn-apply').focus();
        }
    } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        let targetR = r;
        let targetC = c;
        if (e.key === "ArrowUp") targetR--;
        if (e.key === "ArrowDown") targetR++;
        
        let isFullySelected = (this.selectionStart === 0 && this.selectionEnd === this.value.length);
        
        if (e.key === "ArrowLeft" && (isFullySelected || this.selectionStart === 0)) targetC--;
        if (e.key === "ArrowRight" && (isFullySelected || this.selectionEnd === this.value.length)) targetC++;

        if (targetR >= 0 && targetR < matrixRows && targetC >= 0 && targetC < matrixCols) {
            e.preventDefault();
            const targetInput = document.querySelector(`.matrix-cell[data-r="${targetR}"][data-c="${targetC}"]`);
            if (targetInput) targetInput.parentElement.click();
        }
    }
}

function handlePaste(e) {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    if (!pasteData) return;

    // Parse rows separated by newline, cols separated by tab/comma/space
    const rows = pasteData.trim().split('\n').map(row => 
        row.trim().split(/[\t, ]+/).filter(val => val !== "")
    );

    const startR = parseInt(this.dataset.r, 10);
    const startC = parseInt(this.dataset.c, 10);

    for (let i = 0; i < rows.length; i++) {
        for (let j = 0; j < rows[i].length; j++) {
            let targetR = startR + i;
            let targetC = startC + j;
            if (targetR >= 0 && targetR < matrixRows && targetC >= 0 && targetC < matrixCols) {
                const targetInput = document.querySelector(`.matrix-cell[data-r="${targetR}"][data-c="${targetC}"]`);
                if (targetInput) {
                    targetInput.value = rows[i][j];
                    targetInput.dispatchEvent(new Event("blur"));
                }
            }
        }
    }
}

// Hint Engine
btnHint.addEventListener('click', () => {
    const matrix = getCurrentMatrix();
    if (!matrix) return;

    const hint = calculateNextHint(matrix);
    hintText.innerText = hint;
    hintDisplay.classList.remove('hidden');
});

function hideHint() {
    hintDisplay.classList.add('hidden');
}

function setSingleOpHint(str) {
    document.getElementById("operations-list").innerHTML = "";
    createOpRow(str);
}

function calculateNextHint(M) {
    let k = 0; // current active row pivot
    
    // Forward elimination
    for (let j = 0; j < matrixCols; j++) {
        if (k >= matrixRows) break;
        
        let pivotRow = k;
        let foundPivot = false;
        for (let i = k; i < matrixRows; i++) {
            if (!M[i][j].isZero()) {
                pivotRow = i;
                foundPivot = true;
                break;
            }
        }
        
        if (foundPivot) {
            // Swap if necessary
            if (pivotRow !== k) {
                setSingleOpHint(`R${k + 1} <-> R${pivotRow + 1}`);
                return `Swap Row ${k + 1} and Row ${pivotRow + 1}. We need a non-zero element in the pivot position (${k+1}, ${j+1}).`;
            }
            
            // Normalize pivot to 1
            if (!M[k][j].equals(new Fraction(1, 1))) {
                let factor = new Fraction(1, 1).div(M[k][j]);
                setSingleOpHint(`${factor.toString()}R${k + 1} -> R${k + 1}`);
                return `Multiply Row ${k + 1} by ${factor.toString()} to make the leading element 1.`;
            }
            
            // Eliminate below
            for (let i = k + 1; i < matrixRows; i++) {
                if (!M[i][j].isZero()) {
                    let factor = M[i][j].mult(new Fraction(-1, 1));
                    let sign = factor.n < 0 ? "-" : "+";
                    let facStr = factor.n < 0 ? factor.mult(new Fraction(-1,1)).toString() : factor.toString();
                    setSingleOpHint(`R${i + 1} ${sign} ${facStr} R${k + 1} -> R${i + 1}`);
                    return `Add ${factor.toString()} * Row ${k + 1} to Row ${i + 1} to eliminate the element below the pivot.`;
                }
            }
            k++;
        }
    }
    
    // Back substitution
    k = 0;
    for (let j = 0; j < matrixCols; j++) {
        if (k >= matrixRows) break;
        if (M[k][j].equals(new Fraction(1, 1))) {
            let isZeroLeftOfPivot = true;
            for (let c = 0; c < j; c++) {
                if (!M[k][c].isZero()) isZeroLeftOfPivot = false;
            }

            if (isZeroLeftOfPivot) {
                // Check if any element above this pivot is non-zero
                for (let i = 0; i < k; i++) {
                    if (!M[i][j].isZero()) {
                        let factor = M[i][j].mult(new Fraction(-1, 1));
                        let sign = factor.n < 0 ? "-" : "+";
                        let facStr = factor.n < 0 ? factor.mult(new Fraction(-1,1)).toString() : factor.toString();
                        setSingleOpHint(`R${i + 1} ${sign} ${facStr} R${k + 1} -> R${i + 1}`);
                        return `Add ${factor.toString()} * Row ${k + 1} to Row ${i + 1} to eliminate the element above the pivot and reach RREF.`;
                    }
                }
                k++;
            } else {
                // Something prevents this from being a standard pivot
                k++;
            }
            
        } else if (!M[k][j].isZero()) {
             // Not a 1 pivot
             k++;
        }
    }
    
    return "The matrix is already fully simplified into Reduced Row Echelon Form (RREF)!";
}
