# Linear Algebra Validator

An interactive, web-based tool designed to assist students and educators in performing step-by-step matrix row reductions with precise fractional arithmetic. Say goodbye to messy floating-point errors and confusing calculations!

## Features

- **Precise Fractional Arithmetic:** Implements a custom `Fraction` class to ensure all calculations remain exact, displaying results in clean fractional forms (e.g., `1/2` instead of `0.5`).
- **Customizable Matrices:** Dynamically generate matrices by defining the number of rows (m) and columns (n).
- **Intuitive Row Operations:** Supports standard elementary row operations using a natural syntax:
  - **Row Swap:** `R1 <-> R2`
  - **Scalar Multiplication:** `3R1 -> R1` or simply `3R1`
  - **Row Addition:** `R2 - 2R1 -> R2`
- **Step-by-step History:** Tracks every operation applied to the matrix, displaying the mathematical notation and the resulting matrix state using beautiful LaTeX rendering (powered by KaTeX).
- **Smart Hint Engine:** Stuck? Click the "Hint" button to get the next logical row operation required to reach Reduced Row Echelon Form (RREF).
- **Keyboard Navigation:** Easily navigate and edit the matrix cells using arrow keys. Supports quickly pasting matrix data from spreadsheets.

## How to Run

Since this is a client-side web application without any backend dependencies:

1. Clone or download the repository.
2. Open `index.html` in any modern web browser.
3. Start reducing matrices securely and efficiently!

## Tech Stack

- **HTML5 & Vanilla CSS:** For structuring the application with responsive and modern UI patterns (Glassmorphism aesthetics).
- **Vanilla JavaScript (ES6+):** Manages local state, parses string operations to math routines, handles fractional calculations, and controls DOM manipulations.
- **KaTeX:** Renders mathematical formulas and matrix representations elegantly without heavy load times.
- **Antigravity:** For AI-assisted development.

## License

This project is open-source and available under the terms of the MIT License.
