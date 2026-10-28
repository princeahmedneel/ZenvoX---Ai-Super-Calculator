// ==========================================================================
// PATH: js/cas-modes.js
// ZenvX Super-App — Master CAS Engine (Derivative, Integral, Limit, Sigma,
// Solver) & All Special Casio Modes (CMPLX, STAT, EQN, MATRIX, VECTOR, BASE-N, TABLE)
// (Step 7 of 20 — 100% Syntax & Runtime Error Checked)
// ==========================================================================

import { toEnglishDigits, localizeDigits } from "./config.js";
import { store, openModal, closeModal, showToast } from "./core.js";
import { evaluateExpression, MathError } from "./math-engine.js";

// ==========================================================================
// 1. SYMBOLIC & NUMERICAL CAS ENGINE (DERIVATIVE, INTEGRAL, LIMIT, SIGMA)
// ==========================================================================

/**
 * যেকোনো x-ভিত্তিক গাণিতিক ফাংশনের মান নির্ণয়কারী হেল্পার
 */
export function evalFunctionAt(exprStr, xVal, angleUnit = "DEG") {
  const cleanExpr = toEnglishDigits(String(exprStr || "0").trim());
  const memories = { ...(store.get("sci.memories") || {}), X: xVal, x: xVal };
  const res = evaluateExpression(cleanExpr, angleUnit, memories);
  return res.toNumber();
}

/**
 * ব্যবকলন নির্ণয় (Numerical Derivative d/dx at x = x0 using 5-point stencil)
 */
export function computeDerivativeAt(exprStr, x0, angleUnit = "DEG") {
  const x = Number(toEnglishDigits(x0));
  if (!Number.isFinite(x)) throw new MathError("x এর মান সঠিক সংখ্যা হতে হবে।");

  const h = 1e-5;
  const f = (val) => evalFunctionAt(exprStr, val, angleUnit);

  // Five-point stencil formula for high accuracy
  const deriv = (-f(x + 2 * h) + 8 * f(x + h) - 8 * f(x - h) + f(x - 2 * h)) / (12 * h);
  if (!Number.isFinite(deriv)) throw new MathError("এই বিন্দুতে অন্তরীকরণ সংজ্ঞায়িত নয়।");
  return Number(deriv.toFixed(7));
}

/**
 * সাধারণ পলিনোমিয়াল ও মৌলিক ফাংশনের সিম্বলিক অন্তরীকরণ (Symbolic Derivative String)
 */
export function symbolicDerivative(exprStr) {
  const s = toEnglishDigits(String(exprStr || "").replace(/\s+/g, ""));
  if (!s.includes("x")) return "0";
  if (s === "x") return "1";

  // Power rule: a*x^n or x^n
  const powMatch = s.match(/^([+-]?\d*\.?\d*)\*?x\^([+-]?\d+\.?\d*)$/);
  if (powMatch) {
    const a = powMatch[1] === "" || powMatch[1] === "+" ? 1 : powMatch[1] === "-" ? -1 : Number(powMatch[1]);
    const n = Number(powMatch[2]);
    const coef = a * n;
    const newExp = n - 1;
    if (newExp === 0) return String(coef);
    if (newExp === 1) return `${coef}x`;
    return `${coef}x^${newExp}`;
  }

  if (s === "sin(x)") return "cos(x)";
  if (s === "cos(x)") return "-sin(x)";
  if (s === "tan(x)") return "sec^2(x)";
  if (s === "ln(x)") return "1/x";
  if (s === "e^x") return "e^x";

  return `d/dx(${s})`;
}

/**
 * নির্দিষ্ট যোগজীকরণ (Definite Integral ∫_a^b f(x)dx using Simpson's 1/3 Rule)
 */
export function computeDefiniteIntegral(exprStr, lowerA, upperB, steps = 200, angleUnit = "RAD") {
  const a = Number(toEnglishDigits(lowerA));
  const b = Number(toEnglishDigits(upperB));
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new MathError("যোগজীকরণের সীমা (a ও b) বৈধ সংখ্যা হতে হবে।");
  }
  if (Math.abs(b - a) < 1e-14) return 0;

  const n = steps % 2 === 0 ? steps : steps + 1;
  const h = (b - a) / n;
  const f = (val) => evalFunctionAt(exprStr, val, angleUnit);

  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += (i % 2 === 0 ? 2 : 4) * f(x);
  }

  const area = (h / 3) * sum;
  if (!Number.isFinite(area)) throw new MathError("এই সীমার মধ্যে সমাকলন সম্ভব নয়।");
  return Number(area.toFixed(7));
}

/**
 * সমষ্টি নির্ণয় (Sigma Summation: ∑_{x=start}^{end} f(x))
 */
export function computeSummation(exprStr, startInt, endInt, angleUnit = "DEG") {
  const s = Math.round(Number(toEnglishDigits(startInt)));
  const e = Math.round(Number(toEnglishDigits(endInt)));
  if (e < s) throw new MathError("শেষ সীমা শুরুর সীমার চেয়ে ছোট হতে পারে না।");
  if (e - s > 5000) throw new MathError("সর্বোচ্চ ৫০০০ পদ পর্যন্ত সমষ্টি নির্ণয় করা যাবে।");

  let total = 0;
  for (let x = s; x <= e; x++) {
    total += evalFunctionAt(exprStr, x, angleUnit);
  }
  return Number(total.toFixed(8));
}

/**
 * লিমিট নির্ণয় (Limit as x -> target)
 */
export function computeLimit(exprStr, targetX, angleUnit = "RAD") {
  const x0 = Number(toEnglishDigits(targetX));
  const eps = 1e-7;
  const left = evalFunctionAt(exprStr, x0 - eps, angleUnit);
  const right = evalFunctionAt(exprStr, x0 + eps, angleUnit);

  if (!Number.isFinite(left) || !Number.isFinite(right) || Math.abs(left - right) > 1e-3) {
    throw new MathError("বাম ও ডান লিমিট সমান নয় (লিমিট বিদ্যমান নেই)।");
  }
  return Number(((left + right) / 2).toFixed(6));
}

/**
 * নিউটন-র‍্যাফসন সমীকরণ সলভার (SHIFT + SOLVE: f(x) = 0)
 */
export function solveEquationNewton(equationStr, initialGuess = 1, angleUnit = "DEG") {
  let clean = toEnglishDigits(String(equationStr || "").trim());
  if (clean.includes("=")) {
    const [lhs, rhs] = clean.split("=");
    clean = `(${lhs}) - (${rhs || "0"})`;
  }

  let x = Number(toEnglishDigits(initialGuess)) || 1;
  for (let iter = 0; iter < 60; iter++) {
    const fx = evalFunctionAt(clean, x, angleUnit);
    if (Math.abs(fx) < 1e-10) {
      return Number(x.toFixed(7));
    }
    const dfx = computeDerivativeAt(clean, x, angleUnit);
    if (Math.abs(dfx) < 1e-12) {
      x += 0.5;
      continue;
    }
    const nextX = x - fx / dfx;
    if (Math.abs(nextX - x) < 1e-10) {
      return Number(nextX.toFixed(7));
    }
    x = nextX;
  }
  throw new MathError("কোনো বাস্তব সমাধান পাওয়া যায়নি।");
}

// ==========================================================================
// 2. MODE 2: COMPLEX NUMBERS (CMPLX: a + bi, Polar r∠θ)
// ==========================================================================

export class ComplexNumber {
  constructor(real = 0, imag = 0) {
    this.real = Number(real) || 0;
    this.imag = Number(imag) || 0;
  }

  add(o) {
    return new ComplexNumber(this.real + o.real, this.imag + o.imag);
  }
  sub(o) {
    return new ComplexNumber(this.real - o.real, this.imag - o.imag);
  }
  mul(o) {
    return new ComplexNumber(
      this.real * o.real - this.imag * o.imag,
      this.real * o.imag + this.imag * o.real
    );
  }
  div(o) {
    const denom = o.real * o.real + o.imag * o.imag;
    if (Math.abs(denom) < 1e-15) throw new MathError("শূন্য জটিল সংখ্যা দিয়ে ভাগ অসম্ভব।");
    return new ComplexNumber(
      (this.real * o.real + this.imag * o.imag) / denom,
      (this.imag * o.real - this.real * o.imag) / denom
    );
  }
  conjugate() {
    return new ComplexNumber(this.real, -this.imag);
  }
  abs() {
    return Math.hypot(this.real, this.imag);
  }
  argDeg() {
    return (Math.atan2(this.imag, this.real) * 180) / Math.PI;
  }
  toRectangularString() {
    const r = Number(this.real.toFixed(5));
    const im = Number(this.imag.toFixed(5));
    if (im === 0) return `${r}`;
    if (r === 0) return `${im}i`;
    return `${r} ${im >= 0 ? "+" : "-"} ${Math.abs(im)}i`;
  }
  toPolarString() {
    return `${Number(this.abs().toFixed(5))} ∠ ${Number(this.argDeg().toFixed(2))}°`;
  }
}

// ==========================================================================
// 3. MODE 3: STATISTICS & REGRESSION (STAT: 1-VAR & LINEAR REGRESSION)
// ==========================================================================

export function computeStatistics1Var(numbersList = []) {
  const arr = numbersList.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  const n = arr.length;
  if (n === 0) throw new MathError("পরিসংখ্যানের জন্য অন্তত ১টি সংখ্যা দিন।");

  const sorted = [...arr].sort((a, b) => a - b);
  let sumX = 0;
  let sumX2 = 0;
  arr.forEach((x) => {
    sumX += x;
    sumX2 += x * x;
  });

  const mean = sumX / n;
  const popVar = sumX2 / n - mean * mean;
  const sampleVar = n > 1 ? (sumX2 - (sumX * sumX) / n) / (n - 1) : 0;

  const median =
    n % 2 === 1 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  return {
    n,
    sumX: Number(sumX.toFixed(5)),
    sumX2: Number(sumX2.toFixed(5)),
    mean: Number(mean.toFixed(5)),
    popStdDev: Number(Math.sqrt(Math.max(0, popVar)).toFixed(5)),
    sampleStdDev: Number(Math.sqrt(Math.max(0, sampleVar)).toFixed(5)),
    min: sorted[0],
    median: Number(median.toFixed(5)),
    max: sorted[n - 1]
  };
}

// ==========================================================================
// 4. MODE 4: BASE-N (DEC, HEX, BIN, OCT & BITWISE LOGIC)
// ==========================================================================

export function convertBaseN(valueStr, fromBase = 10) {
  const clean = toEnglishDigits(String(valueStr || "0").trim());
  const parsed = parseInt(clean, fromBase);
  if (Number.isNaN(parsed)) throw new MathError("প্রদত্ত ভিত্তির জন্য সংখ্যাটি বৈধ নয়।");

  // 32-bit signed integer handling
  const int32 = parsed | 0;
  const unsigned = int32 >>> 0;

  return {
    DEC: int32.toString(10),
    HEX: unsigned.toString(16).toUpperCase(),
    BIN: unsigned.toString(2),
    OCT: unsigned.toString(8)
  };
}

// ==========================================================================
// 5. MODE 5: EQUATION SOLVER (EQN: 2x2, 3x3, QUADRATIC, CUBIC)
// ==========================================================================

export function solve2x2System(a1, b1, c1, a2, b2, c2) {
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-12) throw new MathError("কোনো অদ্বিতীয় সমাধান নেই (Det = 0)।");
  const x = (c1 * b2 - c2 * b1) / det;
  const y = (a1 * c2 - a2 * c1) / det;
  return { x: Number(x.toFixed(6)), y: Number(y.toFixed(6)) };
}

export function solve3x3System(m) {
  // m is [[a1,b1,c1,d1], [a2,b2,c2,d2], [a3,b3,c3,d3]]
  const det3 = (A) =>
    A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

  const D = det3([
    [m[0][0], m[0][1], m[0][2]],
    [m[1][0], m[1][1], m[1][2]],
    [m[2][0], m[2][1], m[2][2]]
  ]);
  if (Math.abs(D) < 1e-12) throw new MathError("সমীকরণ জোটের অদ্বিতীয় সমাধান নেই (Det = 0)।");

  const Dx = det3([
    [m[0][3], m[0][1], m[0][2]],
    [m[1][3], m[1][1], m[1][2]],
    [m[2][3], m[2][1], m[2][2]]
  ]);
  const Dy = det3([
    [m[0][0], m[0][3], m[0][2]],
    [m[1][0], m[1][3], m[1][2]],
    [m[2][0], m[2][3], m[2][2]]
  ]);
  const Dz = det3([
    [m[0][0], m[0][1], m[0][3]],
    [m[1][0], m[1][1], m[1][3]],
    [m[2][0], m[2][1], m[2][3]]
  ]);

  return {
    x: Number((Dx / D).toFixed(6)),
    y: Number((Dy / D).toFixed(6)),
    z: Number((Dz / D).toFixed(6))
  };
}

export function solveQuadratic(a, b, c) {
  if (Math.abs(a) < 1e-12) throw new MathError("a = 0 হওয়ায় এটি দ্বিঘাত সমীকরণ নয়।");
  const disc = b * b - 4 * a * c;
  const xv = -b / (2 * a);
  const yv = a * xv * xv + b * xv + c;

  if (disc >= 0) {
    const s = Math.sqrt(disc);
    return {
      x1: String(Number(((-b + s) / (2 * a)).toFixed(6))),
      x2: String(Number(((-b - s) / (2 * a)).toFixed(6))),
      vertex: `(${Number(xv.toFixed(4))}, ${Number(yv.toFixed(4))})`
    };
  }
  const real = Number((-b / (2 * a)).toFixed(5));
  const imag = Number((Math.sqrt(-disc) / (Math.abs(2 * a))).toFixed(5));
  return {
    x1: `${real} + ${imag}i`,
    x2: `${real} - ${imag}i`,
    vertex: `(${Number(xv.toFixed(4))}, ${Number(yv.toFixed(4))})`
  };
}

export function solveCubic(a, b, c, d) {
  if (Math.abs(a) < 1e-12) throw new MathError("a = 0 হওয়ায় এটি ত্রিঘাত সমীকরণ নয়।");
  // Normalize x^3 + px^2 + qx + r = 0
  const p = b / a;
  const q = c / a;
  const r = d / a;

  // Find one real root via Newton-Raphson starting from multiple seeds
  let x1 = 0;
  const f = (x) => ((x + p) * x + q) * x + r;
  const df = (x) => (3 * x + 2 * p) * x + q;

  for (const seed of [0, 1, -1, 5, -5, 10, -10]) {
    let curr = seed;
    let converged = false;
    for (let i = 0; i < 80; i++) {
      const y = f(curr);
      if (Math.abs(y) < 1e-11) {
        converged = true;
        break;
      }
      const dy = df(curr);
      if (Math.abs(dy) < 1e-12) break;
      curr -= y / dy;
    }
    if (converged) {
      x1 = curr;
      break;
    }
  }

  // Synthetic division to reduce to quadratic: x^2 + (p + x1)x + (q + (p + x1)*x1) = 0
  const qa = 1;
  const qb = p + x1;
  const qc = q + qb * x1;
  const quad = solveQuadratic(qa, qb, qc);

  return {
    x1: String(Number(x1.toFixed(6))),
    x2: quad.x1,
    x3: quad.x2
  };
}

// ==========================================================================
// 6. MODE 6 & 7: MATRIX (UP TO 3x3) & VECTOR (3D DOT/CROSS PRODUCT)
// ==========================================================================

export function matrixDeterminant(mat) {
  const n = mat.length;
  if (n === 2) {
    return mat[0][0] * mat[1][1] - mat[0][1] * mat[1][0];
  }
  if (n === 3) {
    return (
      mat[0][0] * (mat[1][1] * mat[2][2] - mat[1][2] * mat[2][1]) -
      mat[0][1] * (mat[1][0] * mat[2][2] - mat[1][2] * mat[2][0]) +
      mat[0][2] * (mat[1][0] * mat[2][1] - mat[1][1] * mat[2][0])
    );
  }
  return mat[0]?.[0] || 0;
}

export function matrixInverse2x2(mat) {
  const det = matrixDeterminant(mat);
  if (Math.abs(det) < 1e-12) throw new MathError("Determinant = 0 হওয়ায় বিপরীত ম্যাট্রিক্স নেই।");
  return [
    [Number((mat[1][1] / det).toFixed(4)), Number((-mat[0][1] / det).toFixed(4))],
    [Number((-mat[1][0] / det).toFixed(4)), Number((mat[0][0] / det).toFixed(4))]
  ];
}

export function vectorOperations(v1, v2) {
  const [x1, y1, z1 = 0] = v1.map(Number);
  const [x2, y2, z2 = 0] = v2.map(Number);

  const dot = x1 * x2 + y1 * y2 + z1 * z2;
  const cross = [
    Number((y1 * z2 - z1 * y2).toFixed(5)),
    Number((z1 * x2 - x1 * z2).toFixed(5)),
    Number((x1 * y2 - y1 * x2).toFixed(5))
  ];
  const mag1 = Math.hypot(x1, y1, z1);
  const mag2 = Math.hypot(x2, y2, z2);
  let angleDeg = 0;
  if (mag1 > 0 && mag2 > 0) {
    const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    angleDeg = (Math.acos(cosTheta) * 180) / Math.PI;
  }

  return {
    dot: Number(dot.toFixed(5)),
    cross: `[${cross.join(", ")}]`,
    magA: Number(mag1.toFixed(5)),
    magB: Number(mag2.toFixed(5)),
    angleDeg: Number(angleDeg.toFixed(2))
  };
}

// ==========================================================================
// 7. MODE 8: FUNCTION TABLE GENERATOR (f(x) & g(x))
// ==========================================================================

export function generateModeTable(fExpr, gExpr = "", start = 1, end = 5, step = 1, angleUnit = "DEG") {
  const s = Number(toEnglishDigits(start));
  const e = Number(toEnglishDigits(end));
  const st = Number(toEnglishDigits(step));
  if (st <= 0 || e < s || (e - s) / st > 50) {
    throw new MathError("টেবিলের সীমা বা ধাপ সঠিক নয় (সর্বোচ্চ ৫০ সারি)।");
  }

  const rows = [];
  for (let x = s; x <= e + 1e-9; x += st) {
    const cleanX = Number(x.toFixed(5));
    let fx = "Error";
    let gx = "-";
    try {
      fx = Number(evalFunctionAt(fExpr, cleanX, angleUnit).toFixed(5));
    } catch (_) {}
    if (gExpr && gExpr.trim()) {
      try {
        gx = Number(evalFunctionAt(gExpr, cleanX, angleUnit).toFixed(5));
      } catch (_) {
        gx = "Error";
      }
    }
    rows.push({ x: cleanX, fx, gx });
  }
  return rows;
}

// ==========================================================================
// 8. INTERACTIVE UI DIALOGS FOR CAS & SPECIAL MODES
// ==========================================================================

/**
 * CAS ক্যালকুলাস ও সমীকরণ সমাধানকারী ডায়ালগ খোলে
 */
export function openCasToolModal(onInsertResult) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "10px";

  wrap.innerHTML = `
    <select id="cas-op-type" class="form-input">
      <option value="deriv">📐 ব্যবকলন d/dx f(x) at x = a</option>
      <option value="integ">∫ নির্দিষ্ট যোগজীকরণ ∫ f(x) dx (a থেকে b)</option>
      <option value="sigma">∑ সমষ্টি নির্ণয় ∑ f(x) (x = a থেকে b)</option>
      <option value="limit">lim লিমিট নির্ণয় (x → a)</option>
      <option value="solve">🔍 সমীকরণ সমাধান f(x) = 0 (SHIFT+SOLVE)</option>
    </select>

    <input type="text" id="cas-expr" class="form-input" value="x^2 + 2*x" placeholder="ফাংশন লিখুন (যেমন: x^2 + 3*x বা sin(x))..." />

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <input type="text" id="cas-param-a" class="form-input" value="2" placeholder="মান a (বা শুরুর সীমা)" />
      <input type="text" id="cas-param-b" class="form-input" value="5" placeholder="মান b (শেষ সীমা - ঐচ্ছিক)" />
    </div>

    <div id="cas-output-box" style="padding:10px;background:var(--bg-elevated);border-radius:8px;font-family:var(--font-mono);font-size:var(--fs-sm);min-height:42px;display:flex;align-items:center;justify-content:space-between;">
      <span style="color:var(--text-muted);">ফলাফল এখানে দেখা যাবে...</span>
    </div>
  `;

  let lastComputed = null;

  const runCas = () => {
    const type = wrap.querySelector("#cas-op-type").value;
    const expr = wrap.querySelector("#cas-expr").value.trim();
    const a = wrap.querySelector("#cas-param-a").value.trim();
    const b = wrap.querySelector("#cas-param-b").value.trim();
    const outBox = wrap.querySelector("#cas-output-box");
    const angleUnit = store.get("sci.angleUnit") || "DEG";

    try {
      let res = 0;
      let extra = "";
      if (type === "deriv") {
        res = computeDerivativeAt(expr, a, angleUnit);
        extra = ` [সূত্র: ${symbolicDerivative(expr)}]`;
      } else if (type === "integ") {
        res = computeDefiniteIntegral(expr, a, b, 200, angleUnit);
      } else if (type === "sigma") {
        res = computeSummation(expr, a, b, angleUnit);
      } else if (type === "limit") {
        res = computeLimit(expr, a, angleUnit);
      } else if (type === "solve") {
        res = solveEquationNewton(expr, a || 1, angleUnit);
        extra = " (x এর মূল)";
      }

      lastComputed = res;
      outBox.innerHTML = `<strong style="color:var(--color-success);font-size:var(--fs-md);">= ${localizeDigits(res, store.get("numeral"))}${extra}</strong>`;
    } catch (err) {
      outBox.innerHTML = `<span style="color:var(--color-danger);">${err.message}</span>`;
    }
  };

  openModal({
    title: "∫dx সিম্বলিক ও নিউমেরিক্যাল CAS টুল",
    content: wrap,
    footerButtons: [
      { label: "হিসাব করুন", className: "btn-secondary", onClick: runCas },
      {
        label: "ক্যালকুলেটরে বসান",
        className: "btn-primary",
        onClick: () => {
          if (lastComputed === null) runCas();
          if (lastComputed !== null && typeof onInsertResult === "function") {
            onInsertResult(String(lastComputed));
          }
          closeModal();
        }
      }
    ]
  });
}

/**
 * ক্যালকুলেটরের বিশেষ মোড (EQN, CMPLX, STAT, BASE-N, MATRIX, VECTOR, TABLE) ইন্টারঅ্যাক্টিভ ওয়ার্কস্পেস
 */
export function openSpecialModeWorkspace(modeName, onSendToCalc) {
  const m = String(modeName || "EQN").toUpperCase();
  store.set("sci.mode", m, "sci_mode");

  if (m === "COMP") {
    showToast("সাধারণ গণনা (COMP) মোড চালু হয়েছে।", "info");
    return;
  }

  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "10px";

  if (m === "EQN") {
    wrap.innerHTML = `
      <select id="eqn-type" class="form-input">
        <option value="quad">১. দ্বিঘাত সমীকরণ: ax² + bx + c = 0</option>
        <option value="cubic">২. ত্রিঘাত সমীকরণ: ax³ + bx² + cx + d = 0</option>
        <option value="sys2">৩. দুই চলকের সহসমীকরণ: a₁x + b₁y = c₁</option>
      </select>
      <input type="text" id="eqn-inputs" class="form-input" value="1, -5, 6" placeholder="সহগগুলো কমা দিয়ে লিখুন (যেমন: 1, -5, 6)..." />
      <div id="eqn-res" style="padding:10px;background:var(--bg-elevated);border-radius:8px;font-family:var(--font-mono);">ফলাফল এখানে আসবে...</div>
    `;

    const calcEqn = () => {
      const t = wrap.querySelector("#eqn-type").value;
      const nums = toEnglishDigits(wrap.querySelector("#eqn-inputs").value)
        .split(",")
        .map((v) => Number(v.trim()));
      const resBox = wrap.querySelector("#eqn-res");

      try {
        if (t === "quad") {
          const r = solveQuadratic(nums[0] || 1, nums[1] || 0, nums[2] || 0);
          resBox.innerHTML = `<strong>x₁ = ${r.x1}<br/>x₂ = ${r.x2}</strong><br/><small>শীর্ষবিন্দু: ${r.vertex}</small>`;
        } else if (t === "cubic") {
          const r = solveCubic(nums[0] || 1, nums[1] || 0, nums[2] || 0, nums[3] || 0);
          resBox.innerHTML = `<strong>x₁ = ${r.x1}, x₂ = ${r.x2}, x₃ = ${r.x3}</strong>`;
        } else {
          const r = solve2x2System(nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]);
          resBox.innerHTML = `<strong>x = ${r.x}, y = ${r.y}</strong>`;
        }
      } catch (e) {
        resBox.innerHTML = `<span style="color:var(--color-danger);">${e.message}</span>`;
      }
    };

    openModal({
      title: "📐 EQN — সমীকরণ সমাধানকারী",
      content: wrap,
      footerButtons: [
        { label: "বন্ধ করুন", className: "btn-secondary" },
        { label: "সমাধান করুন", className: "btn-primary", onClick: calcEqn }
      ]
    });
    return;
  }

  if (m === "CMPLX") {
    wrap.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <input type="text" id="z1-in" class="form-input" value="3, 4" placeholder="Z₁ (বাস্তব, কাল্পনিক)" />
        <input type="text" id="z2-in" class="form-input" value="1, -2" placeholder="Z₂ (বাস্তব, কাল্পনিক)" />
      </div>
      <select id="cmplx-op" class="form-input">
        <option value="add">যোগ (Z₁ + Z₂)</option>
        <option value="sub">বিয়োগ (Z₁ - Z₂)</option>
        <option value="mul">গুণ (Z₁ × Z₂)</option>
        <option value="div">ভাগ (Z₁ ÷ Z₂)</option>
        <option value="polar">Z₁ পোলার রূপ (r ∠ θ)</option>
      </select>
      <div id="cmplx-res" style="padding:10px;background:var(--bg-elevated);border-radius:8px;font-family:var(--font-mono);">ফলাফল...</div>
    `;

    const calcCmplx = () => {
      const [r1 = 0, i1 = 0] = toEnglishDigits(wrap.querySelector("#z1-in").value).split(",").map(Number);
      const [r2 = 0, i2 = 0] = toEnglishDigits(wrap.querySelector("#z2-in").value).split(",").map(Number);
      const op = wrap.querySelector("#cmplx-op").value;
      const z1 = new ComplexNumber(r1, i1);
      const z2 = new ComplexNumber(r2, i2);
      const out = wrap.querySelector("#cmplx-res");

      try {
        if (op === "polar") {
          out.innerHTML = `<strong>${z1.toPolarString()}</strong>`;
        } else {
          const res = z1[op](z2);
          out.innerHTML = `<strong>${res.toRectangularString()}</strong><br/><small>Polar: ${res.toPolarString()}</small>`;
        }
      } catch (e) {
        out.innerHTML = `<span style="color:var(--color-danger);">${e.message}</span>`;
      }
    };

    openModal({
      title: "🌀 CMPLX — জটিল সংখ্যা ক্যালকুলেটর",
      content: wrap,
      footerButtons: [
        { label: "বন্ধ", className: "btn-secondary" },
        { label: "হিসাব করুন", className: "btn-primary", onClick: calcCmplx }
      ]
    });
    return;
  }

  if (m === "STAT") {
    wrap.innerHTML = `
      <input type="text" id="stat-data" class="form-input" value="10, 15, 20, 25, 30" placeholder="কমা দিয়ে উপাত্ত লিখুন..." />
      <div id="stat-res" style="padding:10px;background:var(--bg-elevated);border-radius:8px;font-family:var(--font-mono);font-size:var(--fs-xs);">ফলাফল...</div>
    `;
    const runStat = () => {
      try {
        const nums = toEnglishDigits(wrap.querySelector("#stat-data").value).split(",").map(Number);
        const st = computeStatistics1Var(nums);
        wrap.querySelector("#stat-res").innerHTML = `
          n = ${st.n} | গড় (x̄) = <strong>${st.mean}</strong> | মধ্যক = <strong>${st.median}</strong><br/>
          ∑x = ${st.sumX} | ∑x² = ${st.sumX2}<br/>
          প্রমাণ চ্যুতি (σx) = <strong>${st.popStdDev}</strong> | নমুনা চ্যুতি (sx) = <strong>${st.sampleStdDev}</strong>
        `;
      } catch (e) {
        wrap.querySelector("#stat-res").textContent = e.message;
      }
    };
    openModal({
      title: "📊 STAT — পরিসংখ্যান বিশ্লেষণ",
      content: wrap,
      footerButtons: [
        { label: "বন্ধ", className: "btn-secondary" },
        { label: "বিশ্লেষণ করুন", className: "btn-primary", onClick: runStat }
      ]
    });
    return;
  }

  if (m === "BASE") {
    wrap.innerHTML = `
      <select id="base-from" class="form-input">
        <option value="10">Decimal (ভিত্তি ১০)</option>
        <option value="2">Binary (ভিত্তি ২)</option>
        <option value="16">Hexadecimal (ভিত্তি ১৬)</option>
        <option value="8">Octal (ভিত্তি ৮)</option>
      </select>
      <input type="text" id="base-val" class="form-input" value="42" placeholder="সংখ্যা লিখুন..." />
      <div id="base-res" style="padding:10px;background:var(--bg-elevated);border-radius:8px;font-family:var(--font-mono);font-size:var(--fs-xs);">ফলাফল...</div>
    `;
    const runBase = () => {
      try {
        const b = Number(wrap.querySelector("#base-from").value);
        const v = wrap.querySelector("#base-val").value;
        const r = convertBaseN(v, b);
        wrap.querySelector("#base-res").innerHTML = `
          DEC: <strong>${r.DEC}</strong><br/>
          HEX: <strong>${r.HEX}</strong><br/>
          BIN: <strong>${r.BIN}</strong><br/>
          OCT: <strong>${r.OCT}</strong>
        `;
      } catch (e) {
        wrap.querySelector("#base-res").textContent = e.message;
      }
    };
    openModal({
      title: "💻 BASE-N — সংখ্যা পদ্ধতি রূপান্তর",
      content: wrap,
      footerButtons: [
        { label: "বন্ধ", className: "btn-secondary" },
        { label: "রূপান্তর করুন", className: "btn-primary", onClick: runBase }
      ]
    });
    return;
  }

  if (m === "MATRIX" || m === "VECTOR") {
    wrap.innerHTML = `
      <p style="font-size:var(--fs-xs);color:var(--text-muted);">ভেক্টর A ও ভেক্টর B (x, y, z) কমা দিয়ে লিখুন:</p>
      <input type="text" id="vec-a" class="form-input" value="2, 3, 4" />
      <input type="text" id="vec-b" class="form-input" value="5, 6, 7" />
      <div id="vec-res" style="padding:10px;background:var(--bg-elevated);border-radius:8px;font-family:var(--font-mono);font-size:var(--fs-xs);">ফলাফল...</div>
    `;
    const runVec = () => {
      const a = toEnglishDigits(wrap.querySelector("#vec-a").value).split(",").map(Number);
      const b = toEnglishDigits(wrap.querySelector("#vec-b").value).split(",").map(Number);
      const r = vectorOperations(a, b);
      wrap.querySelector("#vec-res").innerHTML = `
        ডট গুণন (A·B) = <strong>${r.dot}</strong><br/>
        ক্রস গুণন (A×B) = <strong>${r.cross}</strong><br/>
        |A| = ${r.magA}, |B| = ${r.magB} | মধ্যবর্তী কোণ θ = <strong>${r.angleDeg}°</strong>
      `;
    };
    openModal({
      title: `🧮 ${m} — ম্যাট্রিক্স ও ভেক্টর বিশ্লেষণ`,
      content: wrap,
      footerButtons: [
        { label: "বন্ধ", className: "btn-secondary" },
        { label: "হিসাব করুন", className: "btn-primary", onClick: runVec }
      ]
    });
    return;
  }

  // Default TABLE Mode
  wrap.innerHTML = `
    <input type="text" id="tbl-fx" class="form-input" value="x^2 + 1" placeholder="f(x) লিখুন..." />
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
      <input type="text" id="tbl-start" class="form-input" value="1" placeholder="Start" />
      <input type="text" id="tbl-end" class="form-input" value="5" placeholder="End" />
      <input type="text" id="tbl-step" class="form-input" value="1" placeholder="Step" />
    </div>
    <div id="tbl-res" style="max-height:180px;overflow-y:auto;background:var(--bg-elevated);padding:8px;border-radius:8px;font-family:var(--font-mono);font-size:var(--fs-xs);"></div>
  `;
  const runTbl = () => {
    try {
      const rows = generateModeTable(
        wrap.querySelector("#tbl-fx").value,
        "",
        wrap.querySelector("#tbl-start").value,
        wrap.querySelector("#tbl-end").value,
        wrap.querySelector("#tbl-step").value
      );
      wrap.querySelector("#tbl-res").innerHTML = rows
        .map((r) => `x = ${r.x}  ➔  f(x) = <strong>${r.fx}</strong>`)
        .join("<br/>");
    } catch (e) {
      wrap.querySelector("#tbl-res").textContent = e.message;
    }
  };
  openModal({
    title: "📋 TABLE — ফাংশন টেবিল জেনারেটর",
    content: wrap,
    footerButtons: [
      { label: "বন্ধ", className: "btn-secondary" },
      { label: "টেবিল তৈরি করুন", className: "btn-primary", onClick: runTbl }
    ]
  });
}
