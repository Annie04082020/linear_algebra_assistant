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
let currentMode = 'row_reduction'; // Modes: row_reduction, inverse, lu, split
let rowSplits = new Set();
let colSplits = new Set();
let rowSplitsA = new Set();
let colSplitsA = new Set();
let rowSplitsB = new Set();
let colSplitsB = new Set();
let matrixARows = 2, matrixACols = 2;
let matrixBRows = 2, matrixBCols = 2;

let isDraggingSplit = false;
let draggedSplitType = null;
let draggedSplitIndex = null;
let dragStartedOnActive = false;
let didDragMove = false;

document.addEventListener('mouseup', () => {
    if (isDraggingSplit) {
        isDraggingSplit = false;
        draggedSplitType = null;
        draggedSplitIndex = null;
    }
});

// DOM Elements
const btnGenerate = document.getElementById("btn-generate");
const inputsContainer = document.getElementById("matrix-inputs");
const btnApply = document.getElementById("btn-apply");
const btnHint = document.getElementById("btn-hint");
const btnAutoRef = document.getElementById("btn-auto-ref");
const btnAutoRref = document.getElementById("btn-auto-rref");
const btnReset = document.getElementById("btn-reset");
const btnClear = document.getElementById("btn-clear");
const historyList = document.getElementById("history-list");
const hintDisplay = document.getElementById("hint-display");
const hintText = document.getElementById("hint-text");
const btnAutoLu = document.getElementById("btn-auto-lu");

// Operations DOM Elements
const dimControlsOperations = document.getElementById("dim-controls-operations");
const singleMatrixContainer = document.getElementById("single-matrix-container");
const dualMatrixContainer = document.getElementById("dual-matrix-container");
const actionsOperations = document.getElementById("actions-operations");
const toggleBlockMode = document.getElementById("toggle-block-mode");
const blockModeHint = document.getElementById("block-mode-hint");
const btnOpAdd = document.getElementById("btn-op-add");
const btnOpSub = document.getElementById("btn-op-sub");
const btnOpMul = document.getElementById("btn-op-mul");

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
    setupTabs();
    generateGrid();
    setupOperationInputs();
    
    // Matrix operations buttons
    document.getElementById('btn-op-add').addEventListener('click', () => {
        if (toggleBlockMode.checked) executeStandardOperation('add');
        else executeStandardOperation('add');
    });
    document.getElementById('btn-op-sub').addEventListener('click', () => {
        if (toggleBlockMode.checked) executeStandardOperation('sub');
        else executeStandardOperation('sub');
    });
    document.getElementById('btn-op-mul').addEventListener('click', () => {
        if (toggleBlockMode.checked) executeBlockOperation('mul');
        else executeStandardOperation('mul');
    });
    
    document.getElementById("op-a-rows").addEventListener("change", generateGrid);
    document.getElementById("op-a-cols").addEventListener("change", generateGrid);
    document.getElementById("op-b-rows").addEventListener("change", generateGrid);
    document.getElementById("op-b-cols").addEventListener("change", generateGrid);
    toggleBlockMode.addEventListener("change", generateGrid);
    
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

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMode = e.target.dataset.mode;
            updateUIMode();
        });
    });
}

function updateUIMode() {
    // Hide all dimension controls and actions
    document.getElementById('dim-controls-default').classList.add('hidden');
    document.getElementById('dim-controls-square').classList.add('hidden');
    dimControlsOperations.classList.add('hidden');
    
    document.getElementById('actions-row-reduction').classList.add('hidden');
    document.getElementById('actions-lu').classList.add('hidden');
    actionsOperations.classList.add('hidden');
    
    document.getElementById('btn-add-op').classList.add('hidden');
    document.getElementById('operations-list').classList.add('hidden');
    
    singleMatrixContainer.classList.add('hidden');
    dualMatrixContainer.classList.add('hidden');
    
    if (currentMode === 'row_reduction') {
        document.getElementById('dim-controls-default').classList.remove('hidden');
        document.getElementById('actions-row-reduction').classList.remove('hidden');
        document.getElementById('btn-add-op').classList.remove('hidden');
        document.getElementById('operations-list').classList.remove('hidden');
        singleMatrixContainer.classList.remove('hidden');
    } else if (currentMode === 'inverse') {
        document.getElementById('dim-controls-square').classList.remove('hidden');
        document.getElementById('actions-row-reduction').classList.remove('hidden');
        document.getElementById('btn-add-op').classList.remove('hidden');
        document.getElementById('operations-list').classList.remove('hidden');
        singleMatrixContainer.classList.remove('hidden');
    } else if (currentMode === 'lu') {
        document.getElementById('dim-controls-square').classList.remove('hidden');
        document.getElementById('actions-lu').classList.remove('hidden');
        singleMatrixContainer.classList.remove('hidden');
    } else if (currentMode === 'operations') {
        dimControlsOperations.classList.remove('hidden');
        actionsOperations.classList.remove('hidden');
        dualMatrixContainer.classList.remove('hidden');
        // Hide general operations clear/reset if needed, but we keep them
    }
    
    generateGrid();
}

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
    if (currentMode === 'operations') {
        matrixARows = parseInt(document.getElementById("op-a-rows").value, 10);
        matrixACols = parseInt(document.getElementById("op-a-cols").value, 10);
        matrixBRows = parseInt(document.getElementById("op-b-rows").value, 10);
        matrixBCols = parseInt(document.getElementById("op-b-cols").value, 10);
        
        if (matrixARows < 1 || matrixACols < 1 || matrixBRows < 1 || matrixBCols < 1) {
            alert("Dimensions must be positive.");
            return;
        }

        let blockMode = toggleBlockMode.checked;
        if (!blockMode) {
            rowSplitsA.clear(); colSplitsA.clear();
            rowSplitsB.clear(); colSplitsB.clear();
            blockModeHint.classList.add('hidden');
        } else {
            blockModeHint.classList.remove('hidden');
        }
        
        buildGridDOM(document.getElementById('matrix-a-inputs'), matrixARows, matrixACols, false, blockMode, rowSplitsA, colSplitsA);
        buildGridDOM(document.getElementById('matrix-b-inputs'), matrixBRows, matrixBCols, false, blockMode, rowSplitsB, colSplitsB);
        
        historyStates = [];
        renderHistory();
        return;
    }

    if (currentMode === 'row_reduction') {
        matrixRows = parseInt(document.getElementById("rows").value, 10);
        matrixCols = parseInt(document.getElementById("cols").value, 10);
    } else if (currentMode === 'inverse') {
        let n = parseInt(document.getElementById("square-n").value, 10);
        matrixRows = n;
        matrixCols = 2 * n;
        colSplits.clear(); // no interactive splits for inverse
    } else if (currentMode === 'lu') {
        let n = parseInt(document.getElementById("square-n").value, 10);
        matrixRows = n;
        matrixCols = n;
    }
    
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

    // No interactive split dividers for any single-matrix mode
    let allowSplit = false;
    buildGridDOM(inputsContainer, matrixRows, matrixCols, currentMode === 'inverse', allowSplit, rowSplits, colSplits);
    
    historyStates = [];
    initialMatrixState = null;
    renderHistory();
    hideHint();
}

function buildGridDOM(container, rows, cols, isInverseMode, allowSplit, rSplits, cSplits) {
    if (allowSplit) {
        container.classList.add('split-mode');
        
        let colsTemplate = [];
        for(let i=0; i<cols; i++) {
            colsTemplate.push("minmax(60px, auto)");
            if (i < cols - 1) colsTemplate.push("8px");
        }
        container.style.gridTemplateColumns = colsTemplate.join(" ");

        let rowsTemplate = [];
        for(let i=0; i<rows; i++) {
            rowsTemplate.push("auto");
            if (i < rows - 1) rowsTemplate.push("8px");
        }
        container.style.gridTemplateRows = rowsTemplate.join(" ");
    } else {
        container.classList.remove('split-mode');
        container.style.gridTemplateColumns = `repeat(${cols}, minmax(60px, auto))`;
        container.style.gridTemplateRows = "";
    }
    
    container.innerHTML = "";

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let cellContainer = document.createElement("div");
            cellContainer.className = "matrix-cell-container";
            cellContainer.dataset.r = r;
            cellContainer.dataset.c = c;

            let display = document.createElement("div");
            display.className = "matrix-cell-display";
            
            let input = document.createElement("input");
            input.type = "text";
            input.className = "matrix-cell matrix-cell-input";
            input.dataset.r = r;
            input.dataset.c = c;
            
            if (isInverseMode && c >= rows) {
                let isDiagonal = (r === c - rows);
                input.value = isDiagonal ? "1" : "0";
                input.disabled = true;
                cellContainer.style.background = "rgba(255, 255, 255, 0.05)";
            } else {
                input.value = "0";
            }
            // Static augmented matrix divider — not interactive
            if (isInverseMode && c === rows - 1) {
                cellContainer.style.borderRight = "2px solid var(--highlight)";
                cellContainer.style.paddingRight = "0.5rem";
                cellContainer.style.marginRight = "0.25rem";
            }
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

            cellContainer.addEventListener("click", () => {
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

            cellContainer.appendChild(display);
            cellContainer.appendChild(input);
            container.appendChild(cellContainer);
            
            if (allowSplit && c < cols - 1) {
                let colDiv = document.createElement("div");
                colDiv.className = "col-divider" + (cSplits.has(c) ? " active" : "");
                colDiv.dataset.c = c;
                setupDividerEvents(colDiv, 'col', rSplits, cSplits, container);
                container.appendChild(colDiv);
            }
        }
        
        if (allowSplit && r < rows - 1) {
            for (let c = 0; c < cols; c++) {
                let rowDiv = document.createElement("div");
                rowDiv.className = "row-divider" + (rSplits.has(r) ? " active" : "");
                rowDiv.dataset.r = r;
                setupDividerEvents(rowDiv, 'row', rSplits, cSplits, container);
                container.appendChild(rowDiv);
                
                if (c < cols - 1) {
                    let inter = document.createElement("div");
                    inter.className = "intersection";
                    container.appendChild(inter);
                }
            }
        }
    }
}

function setupDividerEvents(div, type, rSplits, cSplits, container) {
    div.addEventListener('mousedown', (e) => {
        isDraggingSplit = true;
        draggedSplitType = type;
        draggedSplitIndex = parseInt(type === 'col' ? div.dataset.c : div.dataset.r, 10);
        let splits = type === 'col' ? cSplits : rSplits;
        dragStartedOnActive = splits.has(draggedSplitIndex);
        didDragMove = false;
        e.preventDefault(); // Prevent text selection
    });

    div.addEventListener('mouseenter', (e) => {
        if (isDraggingSplit && draggedSplitType === type) {
            let index = parseInt(type === 'col' ? div.dataset.c : div.dataset.r, 10);
            if (index !== draggedSplitIndex) {
                didDragMove = true;
                let splits = type === 'col' ? cSplits : rSplits;
                
                splits.delete(draggedSplitIndex);
                splits.add(index);
                
                container.querySelectorAll(`.${type}-divider`).forEach(d => {
                    let dIdx = parseInt(type === 'col' ? d.dataset.c : d.dataset.r, 10);
                    if (splits.has(dIdx)) {
                        d.classList.add('active');
                    } else {
                        d.classList.remove('active');
                    }
                });
                
                draggedSplitIndex = index;
            }
        }
    });

    div.addEventListener('mouseup', (e) => {
        if (isDraggingSplit && !didDragMove) {
            let index = parseInt(type === 'col' ? div.dataset.c : div.dataset.r, 10);
            let splits = type === 'col' ? cSplits : rSplits;
            if (splits.has(index)) {
                splits.delete(index);
                div.classList.remove('active');
            } else {
                splits.add(index);
                div.classList.add('active');
            }
        }
    });
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
    const cells = document.querySelectorAll(".matrix-cell-input");
    cells.forEach(c => {
        if (!c.disabled) {
            c.value = "0";
            c.dispatchEvent(new Event("blur"));
        }
    });
    historyStates = [];
    initialMatrixState = null;
    renderHistory();
    hideHint();
});

function getMatrixValues(containerId, rows, cols) {
    let m = [];
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    try {
        for (let r = 0; r < rows; r++) {
            let rowObj = [];
            for (let c = 0; c < cols; c++) {
                let input = container.querySelector(`.matrix-cell-input[data-r="${r}"][data-c="${c}"]`);
                if (!input) return null;
                rowObj.push(Fraction.parse(input.value));
            }
            m.push(rowObj);
        }
        return m;
    } catch (e) {
        alert("Invalid input detected! Please enter valid numbers or fractions.");
        return null;
    }
}

function getCurrentMatrix() {
    return getMatrixValues('matrix-inputs', matrixRows, matrixCols);
}

// Display matrix onto UI inputs
function setMatrixToUI(m) {
    const container = document.getElementById('matrix-inputs');
    if (!container) return;
    for (let r = 0; r < matrixRows; r++) {
        for (let c = 0; c < matrixCols; c++) {
            let input = container.querySelector(`.matrix-cell-input[data-r="${r}"][data-c="${c}"]`);
            if (input && !input.disabled) {
                input.value = m[r][c].toString();
                input.dispatchEvent(new Event("blur"));
            }
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

        if (state.type === 'lu') {
            const wrapper = document.createElement('div');
            wrapper.style.display = idx === 0 ? 'flex' : 'none';
            wrapper.style.gap = '1rem';
            wrapper.style.justifyContent = 'center';

            const lGrid = document.createElement('div');
            lGrid.className = 'history-matrix';
            lGrid.style.gridTemplateColumns = `repeat(${matrixCols}, minmax(45px, auto))`;
            
            const uGrid = document.createElement('div');
            uGrid.className = 'history-matrix';
            uGrid.style.gridTemplateColumns = `repeat(${matrixCols}, minmax(45px, auto))`;

            for (let r = 0; r < matrixRows; r++) {
                for (let c = 0; c < matrixCols; c++) {
                    const lCell = document.createElement('div');
                    lCell.innerHTML = `$ \\displaystyle ${state.L[r][c].toLatex()} $`;
                    lGrid.appendChild(lCell);
                    
                    const uCell = document.createElement('div');
                    uCell.innerHTML = `$ \\displaystyle ${state.U[r][c].toLatex()} $`;
                    uGrid.appendChild(uCell);
                }
            }
            
            const lContainer = document.createElement('div');
            lContainer.innerHTML = "<div style='text-align: center; color: var(--highlight); margin-bottom: 0.5rem;'>L</div>";
            lContainer.appendChild(lGrid);
            
            const uContainer = document.createElement('div');
            uContainer.innerHTML = "<div style='text-align: center; color: var(--success); margin-bottom: 0.5rem;'>U</div>";
            uContainer.appendChild(uGrid);

            wrapper.appendChild(lContainer);
            wrapper.appendChild(uContainer);
            
            titleDiv.addEventListener('click', () => {
                if (wrapper.style.display === 'none') {
                    wrapper.style.display = 'flex';
                    titleDiv.querySelector('.toggle-icon').innerText = '▼';
                } else {
                    wrapper.style.display = 'none';
                    titleDiv.querySelector('.toggle-icon').innerText = '▶';
                }
            });
            
            stepDiv.appendChild(wrapper);
        } else {
            const mRows = state.matrix.length;
            const mCols = state.matrix[0] ? state.matrix[0].length : 0;
            
            const matrixGrid = document.createElement('div');
            matrixGrid.className = 'history-matrix';
            matrixGrid.style.gridTemplateColumns = `repeat(${mCols}, minmax(45px, auto))`;
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

            let stateRowSplits = state.rowSplits || (currentMode === 'operations' ? new Set() : rowSplits);
            let stateColSplits = state.colSplits || (currentMode === 'operations' ? new Set() : colSplits);

            for (let r = 0; r < mRows; r++) {
                for (let c = 0; c < mCols; c++) {
                    const cell = document.createElement('div');
                    cell.innerHTML = `$ \\displaystyle ${state.matrix[r][c].toLatex()} $`;
                    
                    if (stateColSplits.has(c)) {
                        cell.style.borderRight = "2px solid var(--highlight)";
                    }
                    if (stateRowSplits.has(r)) {
                        cell.style.borderBottom = "2px solid var(--highlight)";
                    }
                    // Static inverse mode divider in history
                    if (currentMode === 'inverse' && c === matrixRows - 1) {
                        cell.style.borderRight = "2px solid var(--highlight)";
                        cell.style.paddingRight = "0.5rem";
                    }

                    matrixGrid.appendChild(cell);
                }
            }

            stepDiv.appendChild(matrixGrid);
        }
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
    
    // Determine which container this input belongs to
    const container = this.closest('.matrix-grid');
    const containerId = container ? container.id : 'matrix-inputs';
    
    // Count rows and cols in this specific container
    let maxR = 0, maxC = 0;
    container.querySelectorAll('.matrix-cell-input').forEach(inp => {
        maxR = Math.max(maxR, parseInt(inp.dataset.r, 10));
        maxC = Math.max(maxC, parseInt(inp.dataset.c, 10));
    });
    const totalRows = maxR + 1;
    const totalCols = maxC + 1;
    
    function focusCell(tr, tc) {
        const target = container.querySelector(`.matrix-cell-input[data-r="${tr}"][data-c="${tc}"]`);
        if (target) target.parentElement.click();
    }
    
    if (e.key === "Enter") {
        e.preventDefault();
        let targetR = r;
        let targetC = c + (e.shiftKey ? -1 : 1);
        
        if (targetC >= totalCols) { targetC = 0; targetR++; }
        else if (targetC < 0) { targetC = totalCols - 1; targetR--; }

        if (targetR >= 0 && targetR < totalRows) {
            focusCell(targetR, targetC);
        } else if (targetR >= totalRows && !e.shiftKey) {
            const applyBtn = document.getElementById('btn-apply');
            if (applyBtn && !applyBtn.closest('.hidden')) applyBtn.focus();
        }
    } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        let targetR = r;
        let targetC = c;
        if (e.key === "ArrowUp") targetR--;
        if (e.key === "ArrowDown") targetR++;
        
        let isFullySelected = (this.selectionStart === 0 && this.selectionEnd === this.value.length);
        
        if (e.key === "ArrowLeft" && (isFullySelected || this.selectionStart === 0)) targetC--;
        if (e.key === "ArrowRight" && (isFullySelected || this.selectionEnd === this.value.length)) targetC++;

        if (targetR >= 0 && targetR < totalRows && targetC >= 0 && targetC < totalCols) {
            e.preventDefault();
            focusCell(targetR, targetC);
        }
    }
}

function handlePaste(e) {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    if (!pasteData) return;

    const rows = pasteData.trim().split('\n').map(row => 
        row.trim().split(/[\t, ]+/).filter(val => val !== "")
    );

    const startR = parseInt(this.dataset.r, 10);
    const startC = parseInt(this.dataset.c, 10);
    const container = this.closest('.matrix-grid') || document;

    for (let i = 0; i < rows.length; i++) {
        for (let j = 0; j < rows[i].length; j++) {
            let targetR = startR + i;
            let targetC = startC + j;
            const targetInput = container.querySelector(`.matrix-cell-input[data-r="${targetR}"][data-c="${targetC}"]`);
            if (targetInput && !targetInput.disabled) {
                targetInput.value = rows[i][j];
                targetInput.dispatchEvent(new Event("blur"));
            }
        }
    }
}

// Auto Reduction Engine
btnAutoRef.addEventListener('click', () => {
    autoReduceMatrix(false);
});

btnAutoRref.addEventListener('click', () => {
    autoReduceMatrix(true);
});

btnAutoLu.addEventListener('click', () => {
    autoLU();
});

btnSplitMatrix.addEventListener('click', () => {
    splitMatrix();
});

function autoReduceMatrix(toRref) {
    let matrix = getCurrentMatrix();
    if (!matrix) return;

    if (historyStates.length === 0) {
        initialMatrixState = matrix.map(row => [...row]);
    }

    let newMatrix = matrix.map(row => [...row]);
    let stepsTaken = 0;
    
    let k = 0; // current active row pivot
    
    // Forward elimination
    for (let j = 0; j < matrixCols; j++) {
        if (k >= matrixRows) break;
        
        let pivotRow = k;
        let foundPivot = false;
        for (let i = k; i < matrixRows; i++) {
            if (!newMatrix[i][j].isZero()) {
                pivotRow = i;
                foundPivot = true;
                break;
            }
        }
        
        if (foundPivot) {
            // Swap if necessary
            if (pivotRow !== k) {
                let temp = newMatrix[k];
                newMatrix[k] = newMatrix[pivotRow];
                newMatrix[pivotRow] = temp;
                let op = { type: 'swap', r1: k + 1, r2: pivotRow + 1 };
                addHistory(opToMath(op), newMatrix.map(row => [...row]));
                stepsTaken++;
            }
            
            // Normalize pivot to 1
            if (!newMatrix[k][j].equals(new Fraction(1, 1))) {
                let factor = new Fraction(1, 1).div(newMatrix[k][j]);
                for (let c = 0; c < matrixCols; c++) {
                    newMatrix[k][c] = newMatrix[k][c].mult(factor);
                }
                let op = { type: 'multiply', r: k + 1, scalar: factor };
                addHistory(opToMath(op), newMatrix.map(row => [...row]));
                stepsTaken++;
            }
            
            // Eliminate below
            for (let i = k + 1; i < matrixRows; i++) {
                if (!newMatrix[i][j].isZero()) {
                    let factor = newMatrix[i][j].mult(new Fraction(-1, 1));
                    for (let c = 0; c < matrixCols; c++) {
                        let addition = newMatrix[k][c].mult(factor);
                        newMatrix[i][c] = newMatrix[i][c].add(addition);
                    }
                    let op = { type: 'add', rTarget: i + 1, rSource: k + 1, scalar: factor };
                    addHistory(opToMath(op), newMatrix.map(row => [...row]));
                    stepsTaken++;
                }
            }
            k++;
        }
    }
    
    // Back substitution
    if (toRref) {
        k = 0;
        for (let j = 0; j < matrixCols; j++) {
            if (k >= matrixRows) break;
            
            if (newMatrix[k][j].equals(new Fraction(1, 1))) {
                let isZeroLeftOfPivot = true;
                for (let c = 0; c < j; c++) {
                    if (!newMatrix[k][c].isZero()) isZeroLeftOfPivot = false;
                }

                if (isZeroLeftOfPivot) {
                    for (let i = 0; i < k; i++) {
                        if (!newMatrix[i][j].isZero()) {
                            let factor = newMatrix[i][j].mult(new Fraction(-1, 1));
                            for (let c = 0; c < matrixCols; c++) {
                                let addition = newMatrix[k][c].mult(factor);
                                newMatrix[i][c] = newMatrix[i][c].add(addition);
                            }
                            let op = { type: 'add', rTarget: i + 1, rSource: k + 1, scalar: factor };
                            addHistory(opToMath(op), newMatrix.map(row => [...row]));
                            stepsTaken++;
                        }
                    }
                    k++;
                } else {
                    k++;
                }
            } else if (!newMatrix[k][j].isZero()) {
                k++;
            }
        }
    }

        if (stepsTaken === 0) {
        alert("The matrix is already in the target form!");
    } else {
        setMatrixToUI(newMatrix);
        hideHint();
    }
}

function autoLU() {
    let matrix = getCurrentMatrix();
    if (!matrix) return;

    if (historyStates.length === 0) {
        initialMatrixState = matrix.map(row => [...row]);
    }

    let U = matrix.map(row => [...row]);
    let L = [];
    for (let r = 0; r < matrixRows; r++) {
        let row = [];
        for (let c = 0; c < matrixCols; c++) {
            row.push(r === c ? new Fraction(1, 1) : new Fraction(0, 1));
        }
        L.push(row);
    }
    
    let stepsTaken = 0;

    for (let j = 0; j < matrixCols; j++) {
        // Find pivot
        if (j >= matrixRows) break;
        if (U[j][j].isZero()) {
            // Check if we need to swap rows. Standard LU doesn't support row swaps without P matrix.
            let found = false;
            for (let i = j + 1; i < matrixRows; i++) {
                if (!U[i][j].isZero()) found = true;
            }
            if (found) {
                alert("Standard LU decomposition requires a row swap here, which implies a PA=LU decomposition. This validator currently computes standard LU only (no row swaps allowed).");
                return;
            } else {
                continue; // Pivot is zero, but nothing below it either. Move to next column.
            }
        }

        // Eliminate below
        for (let i = j + 1; i < matrixRows; i++) {
            if (!U[i][j].isZero()) {
                let factor = U[i][j].div(U[j][j]); // The multiplier
                L[i][j] = factor; // Store in L

                let negativeFactor = factor.mult(new Fraction(-1, 1));
                
                for (let c = j; c < matrixCols; c++) { // Optimize: only need to update from col j onwards
                    let addition = U[j][c].mult(negativeFactor);
                    U[i][c] = U[i][c].add(addition);
                }
                
                let op = { type: 'add', rTarget: i + 1, rSource: j + 1, scalar: negativeFactor };
                addLUHistory(opToMath(op), L.map(row => [...row]), U.map(row => [...row]));
                stepsTaken++;
            }
        }
    }

    if (stepsTaken === 0) {
        alert("The matrix is already upper triangular (L is identity)!");
    } else {
        setMatrixToUI(U);
        hideHint();
    }
}

function addLUHistory(desc, L, U) {
    historyStates.unshift({ desc, L, U, type: 'lu' });
    renderHistory();
}

function splitMatrix() {
    let matrix = getCurrentMatrix();
    if (!matrix) return;

    let rBoundaries = [0, ...Array.from(rowSplits).map(x => x + 1).sort((a,b)=>a-b), matrixRows];
    let cBoundaries = [0, ...Array.from(colSplits).map(x => x + 1).sort((a,b)=>a-b), matrixCols];

    let subMatrices = [];
    for (let i = 0; i < rBoundaries.length - 1; i++) {
        let rowChunks = [];
        for (let j = 0; j < cBoundaries.length - 1; j++) {
            let sub = [];
            for (let r = rBoundaries[i]; r < rBoundaries[i+1]; r++) {
                let row = [];
                for (let c = cBoundaries[j]; c < cBoundaries[j+1]; c++) {
                    row.push(matrix[r][c]);
                }
                sub.push(row);
            }
            rowChunks.push(sub);
        }
        subMatrices.push(rowChunks);
    }

    let bRows = rBoundaries.length - 1;
    let bCols = cBoundaries.length - 1;

    historyStates.unshift({ 
        desc: `Partitioned into ${bRows}x${bCols} blocks`, 
        matrix: matrix, 
        type: 'split', 
        bRows, 
        bCols,
        subMatrices 
    });
    renderHistory();
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

// ==========================================
// Matrix & Block Operations Logic
// ==========================================

function addMatrices(A, B) {
    if (!A || !B || A.length !== B.length || A[0].length !== B[0].length) return null;
    let C = [];
    for (let r = 0; r < A.length; r++) {
        let row = [];
        for (let c = 0; c < A[0].length; c++) {
            row.push(A[r][c].add(B[r][c]));
        }
        C.push(row);
    }
    return C;
}

function subMatrices(A, B) {
    if (!A || !B || A.length !== B.length || A[0].length !== B[0].length) return null;
    let C = [];
    for (let r = 0; r < A.length; r++) {
        let row = [];
        for (let c = 0; c < A[0].length; c++) {
            row.push(A[r][c].sub(B[r][c]));
        }
        C.push(row);
    }
    return C;
}

function multMatrices(A, B) {
    if (!A || !B || A[0].length !== B.length) return null;
    let C = [];
    for (let r = 0; r < A.length; r++) {
        let row = [];
        for (let c = 0; c < B[0].length; c++) {
            let sum = new Fraction(0, 1);
            for (let k = 0; k < A[0].length; k++) {
                sum = sum.add(A[r][k].mult(B[k][c]));
            }
            row.push(sum);
        }
        C.push(row);
    }
    return C;
}

function executeStandardOperation(opType) {
    let A = getMatrixValues('matrix-a-inputs', matrixARows, matrixACols);
    let B = getMatrixValues('matrix-b-inputs', matrixBRows, matrixBCols);
    if (!A || !B) { alert('Could not read matrix values. Please make sure both matrices are generated.'); return; }

    let C = null;
    let desc = "";
    if (opType === 'add') {
        C = addMatrices(A, B);
        desc = "Calculated A + B";
    } else if (opType === 'sub') {
        C = subMatrices(A, B);
        desc = "Calculated A - B";
    } else if (opType === 'mul') {
        C = multMatrices(A, B);
        desc = "Calculated A × B";
    }

    if (!C) {
        alert("Dimensions mismatch for this operation!");
        return;
    }

    historyStates.unshift({ desc: desc, matrix: C });
    renderHistory();
}

function executeBlockOperation(opType) {
    let A = getMatrixValues('matrix-a-inputs', matrixARows, matrixACols);
    let B = getMatrixValues('matrix-b-inputs', matrixBRows, matrixBCols);
    if (!A || !B) return;

    let rBoundariesA = [0, ...Array.from(rowSplitsA).map(x => x + 1).sort((a,b)=>a-b), matrixARows];
    let cBoundariesA = [0, ...Array.from(colSplitsA).map(x => x + 1).sort((a,b)=>a-b), matrixACols];
    
    let rBoundariesB = [0, ...Array.from(rowSplitsB).map(x => x + 1).sort((a,b)=>a-b), matrixBRows];
    let cBoundariesB = [0, ...Array.from(colSplitsB).map(x => x + 1).sort((a,b)=>a-b), matrixBCols];

    function extractSub(matrix, r1, r2, c1, c2) {
        let sub = [];
        for (let r = r1; r < r2; r++) {
            let row = [];
            for (let c = c1; c < c2; c++) {
                row.push(matrix[r][c]);
            }
            sub.push(row);
        }
        return sub;
    }

    let subA = [];
    for (let i = 0; i < rBoundariesA.length - 1; i++) {
        let rowChunks = [];
        for (let j = 0; j < cBoundariesA.length - 1; j++) {
            rowChunks.push(extractSub(A, rBoundariesA[i], rBoundariesA[i+1], cBoundariesA[j], cBoundariesA[j+1]));
        }
        subA.push(rowChunks);
    }

    let subB = [];
    for (let i = 0; i < rBoundariesB.length - 1; i++) {
        let rowChunks = [];
        for (let j = 0; j < cBoundariesB.length - 1; j++) {
            rowChunks.push(extractSub(B, rBoundariesB[i], rBoundariesB[i+1], cBoundariesB[j], cBoundariesB[j+1]));
        }
        subB.push(rowChunks);
    }

    if (opType === 'mul') {
        if (cBoundariesA.length !== rBoundariesB.length) {
            alert("Block multiplication failed: The column partition of A does not match the row partition of B.");
            return;
        }
        // Also check if inner dimensions of blocks match
        for (let k = 0; k < cBoundariesA.length - 1; k++) {
            let colsAk = cBoundariesA[k+1] - cBoundariesA[k];
            let rowsBk = rBoundariesB[k+1] - rBoundariesB[k];
            if (colsAk !== rowsBk) {
                alert(`Block inner dimensions mismatch at partition ${k+1}! Columns of A_ik (${colsAk}) != Rows of B_kj (${rowsBk}).`);
                return;
            }
        }

        let subC = [];
        let rBoundariesC = [...rBoundariesA];
        let cBoundariesC = [...cBoundariesB];
        let C = [];

        // Build result matrix and block step details
        let steps = [];

        for (let i = 0; i < subA.length; i++) {
            let rowChunksC = [];
            let flatRowsC = [];
            for(let r=0; r < rBoundariesC[i+1]-rBoundariesC[i]; r++) flatRowsC.push([]);
            
            for (let j = 0; j < subB[0].length; j++) {
                let sumBlock = null;
                let stepTerms = [];
                for (let k = 0; k < subA[0].length; k++) {
                    let prod = multMatrices(subA[i][k], subB[k][j]);
                    stepTerms.push(`A_{${i+1}${k+1}}B_{${k+1}${j+1}}`);
                    if (!sumBlock) sumBlock = prod;
                    else sumBlock = addMatrices(sumBlock, prod);
                }
                rowChunksC.push(sumBlock);
                steps.push(`$$ C_{${i+1}${j+1}} = ${stepTerms.join(' + ')} $$`);
                
                // assemble flat rows
                for(let r=0; r < sumBlock.length; r++) {
                    flatRowsC[r] = flatRowsC[r].concat(sumBlock[r]);
                }
            }
            subC.push(rowChunksC);
            C = C.concat(flatRowsC);
        }

        let desc = "Block Multiplication A × B:<br>" + steps.join("");
        
        let newRowSplits = new Set();
        let newColSplits = new Set();
        for(let i=1; i<rBoundariesC.length-1; i++) newRowSplits.add(rBoundariesC[i]-1);
        for(let j=1; j<cBoundariesC.length-1; j++) newColSplits.add(cBoundariesC[j]-1);

        historyStates.unshift({ desc: desc, matrix: C, rowSplits: newRowSplits, colSplits: newColSplits });
        renderHistory();
    } else {
        alert("Block Add/Sub is straightforward if partitions match perfectly. Try standard operation or implement custom block add/sub!");
    }
}

// (operation button listeners are registered in DOMContentLoaded)
