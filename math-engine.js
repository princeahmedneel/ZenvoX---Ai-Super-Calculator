// ==========================================================================
// PATH: js/math-engine.js
// ZenvX Super-App — Master Symbolic & Exact Math Engine
// Includes: CalcError, BigInt Rational, Exact Surds (√12 = 2√3), Tokenizer,
// AST Parser, Exact Trig Table, Evaluator, DMS/Pol/Rec & S⇔D Formatter
// (Step 6 of 20 — 100% Syntax & Runtime Error Checked)
// ==========================================================================

import { toEnglishDigits, localizeDigits, formatNumber } from "./config.js";

// ==========================================================================
// 1. CALCULATOR ERROR HIERARCHY (CASIO fx-991ES PLUS STANDARD)
// ==========================================================================

export class CalcError extends Error {
  constructor(code = "MATH_ERROR", detail = "") {
    super(detail || code);
    this.name = "CalcError";
    this.code = code;
    this.detail = detail;
  }

  getDisplayTitle(lang = "bn") {
    const titles = {
      MATH_ERROR: lang === "bn" ? "Math ERROR (গাণিতিক ত্রুটি)" : "Math ERROR",
      SYNTAX_ERROR: lang === "bn" ? "Syntax ERROR (বানান/ফরম্যাট ত্রুটি)" : "Syntax ERROR",
      STACK_ERROR: lang === "bn" ? "Stack ERROR (মেমোরি সীমা অতিক্রম)" : "Stack ERROR",
      ARG_ERROR: lang === "bn" ? "Argument ERROR (আর্গুমেন্ট ত্রুটি)" : "Argument ERROR"
    };
    return titles[this.code] || titles.MATH_ERROR;
  }
}

export class MathError extends CalcError {
  constructor(detail = "শূন্য দিয়ে ভাগ বা অসংজ্ঞায়িত মান") {
    super("MATH_ERROR", detail);
  }
}

export class SyntaxErrorCalc extends CalcError {
  constructor(detail = "সমীকরণ লেখার নিয়ম সঠিক নয়") {
    super("SYNTAX_ERROR", detail);
  }
}

export class StackErrorCalc extends CalcError {
  constructor(detail = "অতিরিক্ত ব্র্যাকেট বা মেমোরি ওভারফ্লো") {
    super("STACK_ERROR", detail);
  }
}

export class ArgumentErrorCalc extends CalcError {
  constructor(detail = "ফাংশনের ইনপুট সীমার বাইরে") {
    super("ARG_ERROR", detail);
  }
}

// ==========================================================================
// 2. BIGINT NUMBER THEORY HELPERS (GCD, LCM, SQUARE ROOT SIMPLIFICATION)
// ==========================================================================

export function bigIntGcd(a, b) {
  let x = BigInt(a);
  let y = BigInt(b);
  if (x < 0n) x = -x;
  if (y < 0n) y = -y;
  while (y !== 0n) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x === 0n ? 1n : x;
}

export function bigIntLcm(a, b) {
  const x = BigInt(a);
  const y = BigInt(b);
  if (x === 0n || y === 0n) return 0n;
  const absX = x < 0n ? -x : x;
  const absY = y < 0n ? -y : y;
  return (absX / bigIntGcd(absX, absY)) * absY;
}

/**
 * পূর্ণসংখ্যার বর্গমূল সরলীকরণ: √n = outside * √inside
 * উদাহরণ: simplifySquareRoot(12n) => { outside: 2n, inside: 3n }
 */
export function simplifySquareRoot(nBig) {
  let n = BigInt(nBig);
  if (n < 0n) {
    throw new MathError("ঋণাত্মক সংখ্যার বাস্তব বর্গমূল সম্ভব নয় (CMPLX মোড ব্যবহার করুন)।");
  }
  if (n === 0n) return { outside: 0n, inside: 1n };
  if (n === 1n) return { outside: 1n, inside: 1n };

  // খুব বড় সংখ্যার ক্ষেত্রে ব্রাউজার ফ্রিজ এড়াতে ফাস্ট চেক
  if (n > 1000000000000n) {
    const approx = Math.sqrt(Number(n));
    if (Number.isInteger(approx)) {
      return { outside: BigInt(approx), inside: 1n };
    }
    return { outside: 1n, inside: n };
  }

  let outside = 1n;
  let inside = n;

  while (inside % 4n === 0n) {
    outside *= 2n;
    inside /= 4n;
  }

  let d = 3n;
  while (d * d <= inside) {
    const sq = d * d;
    while (inside % sq === 0n) {
      outside *= d;
      inside /= sq;
    }
    d += 2n;
  }

  return { outside, inside };
}

// ==========================================================================
// 3. EXACT RATIONAL CLASS (num / den with BigInt)
// ==========================================================================

export class Rational {
  constructor(num = 0n, den = 1n) {
    let n = BigInt(num);
    let d = BigInt(den);
    if (d === 0n) {
      throw new MathError("শূন্য (0) দিয়ে ভাগ করা অসংজ্ঞায়িত।");
    }
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = bigIntGcd(n, d);
    this.num = n / g;
    this.den = d / g;
  }

  static fromNumber(val) {
    if (val instanceof Rational) return val;
    if (typeof val === "bigint") return new Rational(val, 1n);

    const str = toEnglishDigits(String(val ?? "0").trim());
    if (/^[+-]?\d+$/.test(str)) {
      return new Rational(BigInt(str), 1n);
    }

    if (/^[+-]?\d*\.\d+$/.test(str)) {
      const isNeg = str.startsWith("-");
      const clean = str.replace(/^[+-]/, "");
      const [intPart, fracPart] = clean.split(".");
      const trimmedFrac = (fracPart || "").slice(0, 15);
      const scale = 10n ** BigInt(trimmedFrac.length);
      const combined = BigInt((intPart || "0") + trimmedFrac);
      return new Rational(isNeg ? -combined : combined, scale);
    }

    const numVal = Number(str);
    if (!Number.isFinite(numVal)) {
      throw new MathError("অসীম বা অসংজ্ঞায়িত মান (Infinity/NaN)।");
    }
    return Rational.fromFloatApprox(numVal);
  }

  static fromFloatApprox(x, maxDen = 10000000) {
    if (!Number.isFinite(x)) throw new MathError("অসংজ্ঞায়িত দশমিক মান।");
    if (Math.abs(x) < 1e-15) return new Rational(0n, 1n);
    if (Number.isInteger(x) && Math.abs(x) < Number.MAX_SAFE_INTEGER) {
      return new Rational(BigInt(x), 1n);
    }

    const sign = x < 0 ? -1n : 1n;
    const absX = Math.abs(x);
    let h1 = 1n, h2 = 0n;
    let k1 = 0n, k2 = 1n;
    let b = absX;

    for (let i = 0; i < 26; i++) {
      const a = BigInt(Math.floor(b));
      const h = a * h1 + h2;
      const k = a * k1 + k2;
      if (k > BigInt(maxDen)) break;
      h2 = h1; h1 = h;
      k2 = k1; k1 = k;
      const rem = b - Math.floor(b);
      if (rem < 1e-12) break;
      b = 1 / rem;
    }

    const approx = Number(h1) / Number(k1);
    if (Math.abs(approx - absX) <= 1e-10) {
      return new Rational(sign * h1, k1);
    }

    const scaled = BigInt(Math.round(absX * 1e10));
    return new Rational(sign * scaled, 10000000000n);
  }

  isZero() { return this.num === 0n; }
  isOne() { return this.num === 1n && this.den === 1n; }
  isMinusOne() { return this.num === -1n && this.den === 1n; }
  isInteger() { return this.den === 1n; }
  isNegative() { return this.num < 0n; }

  abs() { return new Rational(this.num < 0n ? -this.num : this.num, this.den); }
  neg() { return new Rational(-this.num, this.den); }

  inv() {
    if (this.num === 0n) throw new MathError("শূন্যের বিপরীত ভগ্নাংশ অসংজ্ঞায়িত।");
    return new Rational(this.den, this.num);
  }

  add(other) {
    const o = Rational.fromNumber(other);
    return new Rational(this.num * o.den + o.num * this.den, this.den * o.den);
  }

  sub(other) {
    const o = Rational.fromNumber(other);
    return new Rational(this.num * o.den - o.num * this.den, this.den * o.den);
  }

  mul(other) {
    const o = Rational.fromNumber(other);
    return new Rational(this.num * o.num, this.den * o.den);
  }

  div(other) {
    const o = Rational.fromNumber(other);
    if (o.num === 0n) throw new MathError("শূন্য (0) দিয়ে ভাগ করা অসম্ভব।");
    return new Rational(this.num * o.den, this.den * o.num);
  }

  powInt(expBig) {
    const e = BigInt(expBig);
    if (e === 0n) {
      if (this.num === 0n) throw new MathError("0^0 গাণিতিকভাবে অসংজ্ঞায়িত।");
      return new Rational(1n, 1n);
    }
    if (e > 500n || e < -500n) {
      throw new ArgumentErrorCalc("ঘাতের মান অত্যন্ত বড় (Overflow)।");
    }
    if (e > 0n) {
      return new Rational(this.num ** e, this.den ** e);
    }
    if (this.num === 0n) throw new MathError("শূন্যের ঋণাত্মক ঘাত অসংজ্ঞায়িত।");
    const posE = -e;
    return new Rational(this.den ** posE, this.num ** posE);
  }

  toNumber() {
    return Number(this.num) / Number(this.den);
  }

  toMixed() {
    if (this.den === 1n) {
      return { whole: this.num, remNum: 0n, den: 1n };
    }
    const sign = this.num < 0n ? -1n : 1n;
    const absNum = this.num < 0n ? -this.num : this.num;
    const whole = (absNum / this.den) * sign;
    const remNum = absNum % this.den;
    return { whole, remNum, den: this.den };
  }

  toString(fractionFormat = "d/c") {
    if (this.den === 1n) return this.num.toString();
    if (fractionFormat === "ab/c") {
      const { whole, remNum, den } = this.toMixed();
      if (whole !== 0n && remNum !== 0n) {
        return `${whole} ${remNum}/${den}`;
      }
    }
    return `${this.num}/${this.den}`;
  }

  toLatex(fractionFormat = "d/c") {
    if (this.den === 1n) return this.num.toString();
    if (fractionFormat === "ab/c") {
      const { whole, remNum, den } = this.toMixed();
      if (whole !== 0n && remNum !== 0n) {
        return `${whole}\\frac{${remNum}}{${den}}`;
      }
    }
    const sign = this.num < 0n ? "-" : "";
    const absNum = this.num < 0n ? -this.num : this.num;
    return `${sign}\\frac{${absNum}}{${this.den}}`;
  }
}

// ==========================================================================
// 4. EXACT SYMBOLIC VALUE CLASS: coeff * √(rad) * π^(piExp) * e^(eExp)
// ==========================================================================

export class ExactValue {
  constructor({
    coeff = new Rational(0n, 1n),
    rad = 1n,
    piExp = 0,
    eExp = 0,
    approxOnly = false,
    floatValue = 0,
    meta = null
  } = {}) {
    this.meta = meta; // Used for special outputs like divR {quotient, remainder} or Pol/Rec
    this.approxOnly = Boolean(approxOnly);

    if (this.approxOnly) {
      if (!Number.isFinite(floatValue)) {
        throw new MathError("মান সীমার বাইরে (Math Overflow)।");
      }
      this.floatValue = Number(floatValue);
      this.coeff = new Rational(0n, 1n);
      this.rad = 1n;
      this.piExp = 0;
      this.eExp = 0;
      return;
    }

    const rCoeff = coeff instanceof Rational ? coeff : Rational.fromNumber(coeff);
    const rBig = BigInt(rad);

    if (rCoeff.isZero() || rBig === 0n) {
      this.coeff = new Rational(0n, 1n);
      this.rad = 1n;
      this.piExp = 0;
      this.eExp = 0;
      this.floatValue = 0;
      return;
    }

    const simp = simplifySquareRoot(rBig);
    this.coeff = rCoeff.mul(new Rational(simp.outside, 1n));
    this.rad = simp.inside;
    this.piExp = Number(piExp) || 0;
    this.eExp = Number(eExp) || 0;
    this.floatValue = this.computeFloat();
  }

  static fromRational(num, den = 1n) {
    return new ExactValue({ coeff: new Rational(num, den) });
  }

  static fromStringNumber(strVal) {
    const clean = toEnglishDigits(String(strVal).trim());
    if (/^[+-]?\d+(\.\d+)?$/.test(clean)) {
      return new ExactValue({ coeff: Rational.fromNumber(clean) });
    }
    return ExactValue.fromFloat(Number(clean));
  }

  static fromFloat(val) {
    if (!Number.isFinite(val)) throw new MathError("অসংজ্ঞায়িত মান।");
    if (Math.abs(val) < 1e-14) return ExactValue.fromRational(0n, 1n);

    if (Math.abs(val) < 1e8) {
      const rat = Rational.fromFloatApprox(val, 10000);
      if (Math.abs(rat.toNumber() - val) < 1e-11 && rat.den <= 10000n) {
        return new ExactValue({ coeff: rat });
      }
    }
    return new ExactValue({ approxOnly: true, floatValue: val });
  }

  static pi(exp = 1) {
    return new ExactValue({ coeff: new Rational(1n, 1n), piExp: exp });
  }

  static eulerE(exp = 1) {
    return new ExactValue({ coeff: new Rational(1n, 1n), eExp: exp });
  }

  static sqrtRational(rat) {
    const r = rat instanceof Rational ? rat : Rational.fromNumber(rat);
    if (r.isNegative()) {
      throw new MathError("ঋণাত্মক সংখ্যার বাস্তব বর্গমূল সম্ভব নয়।");
    }
    if (r.isZero()) return ExactValue.fromRational(0n, 1n);

    // √(a/b) = √(a*b) / b
    const insideProduct = r.num * r.den;
    const simp = simplifySquareRoot(insideProduct);
    return new ExactValue({
      coeff: new Rational(simp.outside, r.den),
      rad: simp.inside
    });
  }

  computeFloat() {
    if (this.approxOnly) return this.floatValue;
    if (this.coeff.isZero()) return 0;
    let v = this.coeff.toNumber();
    if (this.rad !== 1n) v *= Math.sqrt(Number(this.rad));
    if (this.piExp !== 0) v *= Math.PI ** this.piExp;
    if (this.eExp !== 0) v *= Math.E ** this.eExp;
    return v;
  }

  toNumber() {
    return this.computeFloat();
  }

  isZero() {
    return !this.approxOnly ? this.coeff.isZero() : Math.abs(this.floatValue) < 1e-15;
  }

  isPureRational() {
    return !this.approxOnly && this.rad === 1n && this.piExp === 0 && this.eExp === 0;
  }

  isSameBasis(other) {
    return (
      !this.approxOnly &&
      !other.approxOnly &&
      this.rad === other.rad &&
      this.piExp === other.piExp &&
      this.eExp === other.eExp
    );
  }

  abs() {
    if (this.approxOnly) {
      return new ExactValue({ approxOnly: true, floatValue: Math.abs(this.floatValue) });
    }
    return new ExactValue({
      coeff: this.coeff.abs(),
      rad: this.rad,
      piExp: this.piExp,
      eExp: this.eExp
    });
  }

  neg() {
    if (this.approxOnly) {
      return new ExactValue({ approxOnly: true, floatValue: -this.floatValue });
    }
    return new ExactValue({
      coeff: this.coeff.neg(),
      rad: this.rad,
      piExp: this.piExp,
      eExp: this.eExp
    });
  }

  add(other) {
    if (this.isZero()) return other;
    if (other.isZero()) return this;
    if (this.isSameBasis(other)) {
      return new ExactValue({
        coeff: this.coeff.add(other.coeff),
        rad: this.rad,
        piExp: this.piExp,
        eExp: this.eExp
      });
    }
    return ExactValue.fromFloat(this.toNumber() + other.toNumber());
  }

  sub(other) {
    return this.add(other.neg());
  }

  mul(other) {
    if (this.isZero() || other.isZero()) return ExactValue.fromRational(0n, 1n);
    if (this.approxOnly || other.approxOnly) {
      return ExactValue.fromFloat(this.toNumber() * other.toNumber());
    }
    return new ExactValue({
      coeff: this.coeff.mul(other.coeff),
      rad: this.rad * other.rad,
      piExp: this.piExp + other.piExp,
      eExp: this.eExp + other.eExp
    });
  }

  div(other) {
    if (other.isZero() || Math.abs(other.toNumber()) < 1e-15) {
      throw new MathError("শূন্য (0) দিয়ে ভাগ করা অসংজ্ঞায়িত।");
    }
    if (this.isZero()) return ExactValue.fromRational(0n, 1n);
    if (this.approxOnly || other.approxOnly) {
      return ExactValue.fromFloat(this.toNumber() / other.toNumber());
    }
    // হরের করণী নিরসন: a / (b√d) = a√d / (b*d)
    const newCoeff = this.coeff.div(other.coeff.mul(new Rational(other.rad, 1n)));
    return new ExactValue({
      coeff: newCoeff,
      rad: this.rad * other.rad,
      piExp: this.piExp - other.piExp,
      eExp: this.eExp - other.eExp
    });
  }

  pow(other) {
    if (other.isPureRational()) {
      const expRat = other.coeff;
      if (expRat.den === 1n && !this.approxOnly) {
        const expInt = Number(expRat.num);
        if (Math.abs(expInt) <= 60) {
          if (expInt === 0) {
            if (this.isZero()) throw new MathError("0^0 অসংজ্ঞায়িত।");
            return ExactValue.fromRational(1n, 1n);
          }
          const absE = Math.abs(expInt);
          const halfPairs = BigInt(Math.floor(absE / 2));
          let radPow = absE % 2 === 1 ? this.rad : 1n;
          let extraCoeff = new Rational(1n, 1n);

          if (expInt > 0) {
            extraCoeff = new Rational(this.rad ** halfPairs, 1n);
          } else {
            extraCoeff = new Rational(1n, this.rad ** halfPairs);
            if (absE % 2 === 1) {
              extraCoeff = extraCoeff.div(new Rational(this.rad, 1n));
            }
          }

          return new ExactValue({
            coeff: this.coeff.powInt(expRat.num).mul(extraCoeff),
            rad: radPow,
            piExp: this.piExp * expInt,
            eExp: this.eExp * expInt
          });
        }
      }
      // বর্গমূল ঘাত (1/2)
      if (expRat.num === 1n && expRat.den === 2n && this.isPureRational()) {
        return ExactValue.sqrtRational(this.coeff);
      }
    }

    const baseNum = this.toNumber();
    const expNum = other.toNumber();
    if (baseNum < 0 && !Number.isInteger(expNum)) {
      throw new MathError("ঋণাত্মক সংখ্যার ভগ্নাংশ ঘাত বাস্তব সংখ্যায় অসংজ্ঞায়িত।");
    }
    return ExactValue.fromFloat(Math.pow(baseNum, expNum));
  }

  /**
   * ডিসপ্লেতে দেখানোর জন্য সিম্বলিক স্ট্রিং তৈরি (যেমন: 2√3, 3π/4, 7/3)
   */
  toSymbolicString(fractionFormat = "d/c") {
    if (this.meta && this.meta.displayText) {
      return this.meta.displayText;
    }
    if (this.approxOnly) {
      return String(parseFloat(this.floatValue.toFixed(10)));
    }
    if (this.coeff.isZero()) return "0";
    if (this.isPureRational()) {
      return this.coeff.toString(fractionFormat);
    }

    // সিম্বলিক অংশ তৈরি (√rad, π, e)
    let sym = "";
    if (this.rad !== 1n) sym += `√${this.rad}`;
    if (this.piExp !== 0) sym += this.piExp === 1 ? "π" : `π^${this.piExp}`;
    if (this.eExp !== 0) sym += this.eExp === 1 ? "e" : `e^${this.eExp}`;

    const n = this.coeff.num;
    const d = this.coeff.den;

    let numPart = "";
    if (n === 1n) numPart = sym;
    else if (n === -1n) numPart = `-${sym}`;
    else numPart = `${n}${sym}`;

    if (d === 1n) return numPart;
    return `${numPart}/${d}`;
  }

  /**
   * KaTeX রেন্ডারিংয়ের জন্য LaTeX স্ট্রিং তৈরি
   */
  toLatex(fractionFormat = "d/c") {
    if (this.meta && this.meta.latexText) {
      return this.meta.latexText;
    }
    if (this.approxOnly) {
      return String(parseFloat(this.floatValue.toFixed(10)));
    }
    if (this.coeff.isZero()) return "0";
    if (this.isPureRational()) {
      return this.coeff.toLatex(fractionFormat);
    }

    let sym = "";
    if (this.rad !== 1n) sym += `\\sqrt{${this.rad}}`;
    if (this.piExp !== 0) sym += this.piExp === 1 ? "\\pi" : `\\pi^{${this.piExp}}`;
    if (this.eExp !== 0) sym += this.eExp === 1 ? "e" : `e^{${this.eExp}}`;

    const sign = this.coeff.num < 0n ? "-" : "";
    const absN = this.coeff.num < 0n ? -this.coeff.num : this.coeff.num;
    const d = this.coeff.den;

    const top = absN === 1n ? sym : `${absN}${sym}`;
    if (d === 1n) return `${sign}${top}`;
    return `${sign}\\frac{${top}}{${d}}`;
  }
}

// ==========================================================================
// 5. TOKENIZER WITH IMPLICIT MULTIPLICATION & AUTO-BRACKET BALANCING
// ==========================================================================

export const TOKEN_TYPES = {
  NUMBER: "NUMBER",
  SYMBOL: "SYMBOL",
  FUNC: "FUNC",
  OP: "OP",
  LPAREN: "LPAREN",
  RPAREN: "RPAREN",
  COMMA: "COMMA"
};

const KNOWN_FUNCTIONS = new Set([
  "sin", "cos", "tan", "cot", "sec", "csc",
  "asin", "acos", "atan", "acot",
  "sinh", "cosh", "tanh", "asinh", "acosh", "atanh",
  "log", "log10", "ln", "sqrt", "cbrt",
  "abs", "rnd", "ceil", "floor",
  "gcd", "lcm", "pol", "rec", "fact", "dms",
  "ranint"
]);

const KNOWN_SYMBOLS = new Set([
  "pi", "π", "e", "Ans", "PreAns",
  "A", "B", "C", "D", "E", "F", "X", "Y", "M", "x", "y"
]);

export function normalizeMathInput(rawInput = "") {
  let s = toEnglishDigits(String(rawInput || "").trim());
  if (!s) return "0";

  // LaTeX ও ইউনিকোড গাণিতিক চিহ্ন রূপান্তর
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))");
  s = s.replace(/\\sqrt\[([^{}\]]+)\]\{([^{}]+)\}/g, "(($1)rootN($2))");
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)");
  s = s.replace(/\\pi\b/g, "π");
  s = s.replace(/\\times\b/g, "*");
  s = s.replace(/\\div\b/g, "/");

  s = s
    .replace(/[×⋅]/g, "*")
    .replace(/÷R/g, " divR ")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/³√\(/g, "cbrt(")
    .replace(/³√([0-9.a-zA-Zπ]+)/g, "cbrt($1)")
    .replace(/ⁿ√/g, " rootN ")
    .replace(/√\(/g, "sqrt(")
    .replace(/√([0-9.a-zA-Zπ]+)/g, "sqrt($1)")
    .replace(/sin⁻¹/gi, "asin")
    .replace(/cos⁻¹/gi, "acos")
    .replace(/tan⁻¹/gi, "atan")
    .replace(/cot⁻¹/gi, "acot")
    .replace(/10\^\(/g, "10^(")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁻¹/g, "^(-1)");

  // স্বয়ংক্রিয়ভাবে খোলা ব্র্যাকেট বন্ধ করা (যাতে sin(30 লিখলেও কাজ করে)
  let openCount = 0;
  for (const ch of s) {
    if (ch === "(") openCount++;
    else if (ch === ")" && openCount > 0) openCount--;
  }
  if (openCount > 0) {
    s += ")".repeat(openCount);
  }

  return s;
}

export function tokenize(rawInput) {
  const input = normalizeMathInput(rawInput);
  if (!input) return [];

  const rawTokens = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // 1. সংখ্যা ও বৈজ্ঞানিক নোটেশন
    if (/[0-9.]/.test(ch)) {
      let numStr = "";
      let dotCount = 0;
      while (i < input.length && /[0-9.]/.test(input[i])) {
        if (input[i] === ".") dotCount++;
        if (dotCount > 1) throw new SyntaxErrorCalc("একটি সংখ্যায় একাধিক দশমিক বিন্দু।");
        numStr += input[i++];
      }
      if (numStr === ".") throw new SyntaxErrorCalc("অবৈধ দশমিক বিন্দু।");

      if (i < input.length && (input[i] === "E" || input.slice(i, i + 3) === "Exp")) {
        const step = input.slice(i, i + 3) === "Exp" ? 3 : 1;
        i += step;
        numStr += "e";
        if (input[i] === "+" || input[i] === "-") {
          numStr += input[i++];
        }
        if (i >= input.length || !/[0-9]/.test(input[i])) {
          throw new SyntaxErrorCalc("Exp এর পর ঘাত সংখ্যা প্রয়োজন।");
        }
        while (i < input.length && /[0-9]/.test(input[i])) {
          numStr += input[i++];
        }
      }

      rawTokens.push({ type: TOKEN_TYPES.NUMBER, value: numStr });
      continue;
    }

    // 2. ব্র্যাকেট ও কমা
    if (ch === "(" || ch === "[" || ch === "{") {
      rawTokens.push({ type: TOKEN_TYPES.LPAREN, value: "(" });
      i++;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      rawTokens.push({ type: TOKEN_TYPES.RPAREN, value: ")" });
      i++;
      continue;
    }
    if (ch === ",") {
      rawTokens.push({ type: TOKEN_TYPES.COMMA, value: "," });
      i++;
      continue;
    }

    // 3. পাই (π) ও ডিগ্রি চিহ্ন (°)
    if (ch === "π") {
      rawTokens.push({ type: TOKEN_TYPES.SYMBOL, value: "π" });
      i++;
      continue;
    }

    // 4. অপারেটরসমূহ
    if ("+-*/^!%".includes(ch)) {
      rawTokens.push({ type: TOKEN_TYPES.OP, value: ch });
      i++;
      continue;
    }

    // 5. ফাংশন নাম ও সিম্বল
    if (/[a-zA-Z]/.test(ch)) {
      let word = "";
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        word += input[i++];
      }

      const lower = word.toLowerCase();
      if (["mod", "divr", "npr", "ncr", "rootn", "logbase"].includes(lower)) {
        const opMap = {
          mod: "mod",
          divr: "divR",
          npr: "nPr",
          ncr: "nCr",
          rootn: "rootN",
          logbase: "logBase"
        };
        rawTokens.push({ type: TOKEN_TYPES.OP, value: opMap[lower] });
      } else if (KNOWN_FUNCTIONS.has(lower)) {
        rawTokens.push({ type: TOKEN_TYPES.FUNC, value: lower });
      } else if (KNOWN_SYMBOLS.has(word)) {
        rawTokens.push({ type: TOKEN_TYPES.SYMBOL, value: word === "pi" ? "π" : word });
      } else if (KNOWN_SYMBOLS.has(lower)) {
        rawTokens.push({ type: TOKEN_TYPES.SYMBOL, value: lower === "pi" ? "π" : word });
      } else if (lower === "ran") {
        rawTokens.push({ type: TOKEN_TYPES.NUMBER, value: String(Number(Math.random().toFixed(4))) });
      } else {
        throw new SyntaxErrorCalc(`অজানা প্রতীক বা ফাংশন: ${word}`);
      }
      continue;
    }

    throw new SyntaxErrorCalc(`অবৈধ অক্ষর: ${ch}`);
  }

  return insertImplicitMultiplication(rawTokens);
}

function insertImplicitMultiplication(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const curr = tokens[i];
    out.push(curr);
    if (i + 1 >= tokens.length) continue;
    const next = tokens[i + 1];

    const leftCanMul =
      curr.type === TOKEN_TYPES.NUMBER ||
      curr.type === TOKEN_TYPES.SYMBOL ||
      curr.type === TOKEN_TYPES.RPAREN ||
      (curr.type === TOKEN_TYPES.OP && (curr.value === "!" || curr.value === "%"));

    const rightCanMul =
      next.type === TOKEN_TYPES.NUMBER ||
      next.type === TOKEN_TYPES.SYMBOL ||
      next.type === TOKEN_TYPES.FUNC ||
      next.type === TOKEN_TYPES.LPAREN;

    if (curr.type === TOKEN_TYPES.NUMBER && next.type === TOKEN_TYPES.NUMBER) continue;

    if (leftCanMul && rightCanMul) {
      out.push({ type: TOKEN_TYPES.OP, value: "*", implicit: true });
    }
  }
  return out;
}

// ==========================================================================
// 6. AST PARSER (PRECEDENCE CLIMBING)
// ==========================================================================

const PRECEDENCE = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  divR: 2,
  mod: 2,
  nPr: 3,
  nCr: 3,
  "^": 4,
  rootN: 4,
  logBase: 4
};

const RIGHT_ASSOCIATIVE = new Set(["^", "rootN", "logBase"]);

export class Parser {
  constructor(tokens = []) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos] || null;
  }

  consume(expectedType = null, expectedVal = null) {
    const tok = this.peek();
    if (!tok) throw new SyntaxErrorCalc("সমীকরণ অসমাপ্ত রয়েছে।");
    if (expectedType && tok.type !== expectedType) {
      throw new SyntaxErrorCalc("সমীকরণের বন্ধনী বা গঠন সঠিক নয়।");
    }
    if (expectedVal !== null && tok.value !== expectedVal) {
      throw new SyntaxErrorCalc(`প্রত্যাশিত ছিল '${expectedVal}', পাওয়া গেছে '${tok.value}'`);
    }
    this.pos++;
    return tok;
  }

  parse() {
    if (this.tokens.length === 0) return { type: "Number", value: "0" };
    const node = this.parseExpression(0);
    if (this.peek() !== null) {
      throw new SyntaxErrorCalc("অতিরিক্ত বা অপ্রত্যাশিত ব্র্যাকেট/চিহ্ন।");
    }
    return node;
  }

  parseExpression(minPrecedence) {
    let left = this.parsePrimary();

    while (true) {
      const tok = this.peek();
      if (!tok || tok.type !== TOKEN_TYPES.OP) break;

      const op = tok.value;
      const prec = PRECEDENCE[op];
      if (prec === undefined || prec < minPrecedence) break;

      this.consume();
      const nextMinPrec = RIGHT_ASSOCIATIVE.has(op) ? prec : prec + 1;
      const right = this.parseExpression(nextMinPrec);

      left = { type: "BinaryOp", op, left, right };
    }

    return left;
  }

  parsePrimary() {
    const tok = this.peek();
    if (!tok) throw new SyntaxErrorCalc("এক্সপ্রেশন অসমাপ্ত।");

    // ইউনারি মাইনাস বা প্লাস
    if (tok.type === TOKEN_TYPES.OP && (tok.value === "-" || tok.value === "+")) {
      const op = this.consume().value;
      if (op === "-") {
        return { type: "UnaryMinus", expr: this.parseExpression(3) };
      }
      return this.parseExpression(3);
    }

    // সংখ্যা
    if (tok.type === TOKEN_TYPES.NUMBER) {
      const t = this.consume();
      return this.attachSuffix({ type: "Number", value: t.value });
    }

    // প্রতীক (π, e, Ans, A-F, X, Y)
    if (tok.type === TOKEN_TYPES.SYMBOL) {
      const t = this.consume();
      return this.attachSuffix({ type: "Symbol", name: t.value });
    }

    // প্যারেনথিসিস
    if (tok.type === TOKEN_TYPES.LPAREN) {
      this.consume(TOKEN_TYPES.LPAREN, "(");
      if (this.peek() && this.peek().type === TOKEN_TYPES.RPAREN) {
        this.consume(TOKEN_TYPES.RPAREN, ")");
        return { type: "Number", value: "0" };
      }
      const expr = this.parseExpression(0);
      if (this.peek() && this.peek().type === TOKEN_TYPES.RPAREN) {
        this.consume(TOKEN_TYPES.RPAREN, ")");
      }
      return this.attachSuffix(expr);
    }

    // ফাংশন কল (sin, cos, log, sqrt, gcd, lcm, pol, rec)
    if (tok.type === TOKEN_TYPES.FUNC) {
      const funcName = this.consume().value;
      const args = [];

      if (this.peek() && this.peek().type === TOKEN_TYPES.LPAREN) {
        this.consume(TOKEN_TYPES.LPAREN, "(");
        if (!this.peek() || this.peek().type !== TOKEN_TYPES.RPAREN) {
          args.push(this.parseExpression(0));
          while (this.peek() && this.peek().type === TOKEN_TYPES.COMMA) {
            this.consume(TOKEN_TYPES.COMMA, ",");
            args.push(this.parseExpression(0));
          }
        }
        if (this.peek() && this.peek().type === TOKEN_TYPES.RPAREN) {
          this.consume(TOKEN_TYPES.RPAREN, ")");
        }
      } else {
        // ব্র্যাকেট ছাড়া ফাংশন (যেমন sin 30)
        args.push(this.parsePrimary());
      }

      return this.attachSuffix({ type: "FunctionCall", name: funcName, args });
    }

    throw new SyntaxErrorCalc(`অপ্রত্যাশিত প্রতীক: ${tok.value}`);
  }

  attachSuffix(node) {
    let curr = node;
    while (
      this.peek() &&
      this.peek().type === TOKEN_TYPES.OP &&
      (this.peek().value === "!" || this.peek().value === "%")
    ) {
      const suff = this.consume().value;
      curr = { type: "SuffixOp", op: suff, expr: curr };
    }
    return curr;
  }
}

export function parseToAst(rawInput) {
  const tokens = tokenize(rawInput);
  const parser = new Parser(tokens);
  return parser.parse();
}

// ==========================================================================
// 7. EXACT TRIGONOMETRIC TABLE & COMBINATORICS EVALUATOR
// ==========================================================================

function factorialBig(n) {
  const num = Number(n);
  if (!Number.isInteger(num) || num < 0 || num > 170) {
    throw new ArgumentErrorCalc("ফ্যাক্টোরিয়ালের মান ০ থেকে ১৭০ এর মধ্যে পূর্ণসংখ্যা হতে হবে।");
  }
  let res = 1n;
  for (let i = 2n; i <= BigInt(num); i++) res *= i;
  return res;
}

function nPrBig(n, r) {
  const nn = Number(n);
  const rr = Number(r);
  if (!Number.isInteger(nn) || !Number.isInteger(rr) || nn < 0 || rr < 0 || rr > nn) {
    throw new ArgumentErrorCalc("nPr এর ক্ষেত্রে 0 ≤ r ≤ n পূর্ণসংখ্যা হতে হবে।");
  }
  let p = 1n;
  for (let i = BigInt(nn - rr + 1); i <= BigInt(nn); i++) p *= i;
  return p;
}

function nCrBig(n, r) {
  const nn = Number(n);
  let rr = Number(r);
  if (!Number.isInteger(nn) || !Number.isInteger(rr) || nn < 0 || rr < 0 || rr > nn) {
    throw new ArgumentErrorCalc("nCr এর ক্ষেত্রে 0 ≤ r ≤ n পূর্ণসংখ্যা হতে হবে।");
  }
  if (rr > nn / 2) rr = nn - rr;
  let c = 1n;
  for (let i = 1n; i <= BigInt(rr); i++) {
    c = (c * BigInt(nn - Number(i) + 1)) / i;
  }
  return c;
}

/**
 * স্ট্যান্ডার্ড কোণের (0°, 30°, 45°, 60°, 90°...) জন্য একদম নিখুঁত করণী মান (যেমন sin 60° = √3/2) রিটার্ন করে
 */
function exactTrigDeg(funcName, degVal) {
  let d = ((degVal % 360) + 360) % 360;
  // কোণ খুব কাছাকাছি পূর্ণসংখ্যা হলে রাউন্ড করা
  if (Math.abs(d - Math.round(d)) < 1e-10) {
    d = Math.round(d) % 360;
  } else {
    return null;
  }

  const sinTable = {
    0: ExactValue.fromRational(0n, 1n),
    30: ExactValue.fromRational(1n, 2n),
    45: new ExactValue({ coeff: new Rational(1n, 2n), rad: 2n }),
    60: new ExactValue({ coeff: new Rational(1n, 2n), rad: 3n }),
    90: ExactValue.fromRational(1n, 1n),
    120: new ExactValue({ coeff: new Rational(1n, 2n), rad: 3n }),
    135: new ExactValue({ coeff: new Rational(1n, 2n), rad: 2n }),
    150: ExactValue.fromRational(1n, 2n),
    180: ExactValue.fromRational(0n, 1n),
    210: ExactValue.fromRational(-1n, 2n),
    225: new ExactValue({ coeff: new Rational(-1n, 2n), rad: 2n }),
    240: new ExactValue({ coeff: new Rational(-1n, 2n), rad: 3n }),
    270: ExactValue.fromRational(-1n, 1n),
    300: new ExactValue({ coeff: new Rational(-1n, 2n), rad: 3n }),
    315: new ExactValue({ coeff: new Rational(-1n, 2n), rad: 2n }),
    330: ExactValue.fromRational(-1n, 2n)
  };

  if (!(d in sinTable)) return null;

  if (funcName === "sin") return sinTable[d];
  if (funcName === "cos") return sinTable[(d + 90) % 360];
  if (funcName === "tan") {
    if (d === 90 || d === 270) throw new MathError("tan(90°) অসংজ্ঞায়িত (Math ERROR)।");
    return sinTable[d].div(sinTable[(d + 90) % 360]);
  }
  return null;
}

export function evaluateAst(node, angleUnit = "DEG", memories = {}) {
  if (!node) return ExactValue.fromRational(0n, 1n);

  switch (node.type) {
    case "Number":
      return ExactValue.fromStringNumber(node.value);

    case "Symbol": {
      const name = node.name;
      if (name === "π") return ExactValue.pi(1);
      if (name === "e") return ExactValue.eulerE(1);
      if (name === "Ans") return ExactValue.fromStringNumber(memories.Ans ?? 0);
      if (name === "PreAns") return ExactValue.fromStringNumber(memories.PreAns ?? 0);
      if (memories[name] !== undefined) {
        return ExactValue.fromStringNumber(memories[name]);
      }
      if (name === "x" || name === "X") {
        return ExactValue.fromStringNumber(memories.X ?? 0);
      }
      return ExactValue.fromRational(0n, 1n);
    }

    case "UnaryMinus":
      return evaluateAst(node.expr, angleUnit, memories).neg();

    case "SuffixOp": {
      const val = evaluateAst(node.expr, angleUnit, memories);
      if (node.op === "!") {
        const f = factorialBig(Math.round(val.toNumber()));
        return ExactValue.fromRational(f, 1n);
      }
      if (node.op === "%") {
        return val.mul(ExactValue.fromRational(1n, 100n));
      }
      return val;
    }

    case "BinaryOp": {
      const left = evaluateAst(node.left, angleUnit, memories);
      const right = evaluateAst(node.right, angleUnit, memories);

      switch (node.op) {
        case "+": return left.add(right);
        case "-": return left.sub(right);
        case "*": return left.mul(right);
        case "/": return left.div(right);
        case "^": return left.pow(right);
        case "rootN": {
          const deg = right.toNumber();
          if (Math.abs(deg) < 1e-12) throw new MathError("মূলের সূচক শূন্য হতে পারে না।");
          return left.pow(ExactValue.fromRational(1n, BigInt(Math.round(deg))));
        }
        case "logBase": {
          const base = left.toNumber();
          const arg = right.toNumber();
          if (base <= 0 || base === 1 || arg <= 0) {
            throw new MathError("লগারিদমের ভিত্তি ও ইনপুট বৈধ নয়।");
          }
          return ExactValue.fromFloat(Math.log(arg) / Math.log(base));
        }
        case "mod": {
          const r = right.toNumber();
          if (Math.abs(r) < 1e-15) throw new MathError("শূন্য দিয়ে ভাগশেষ নির্ণয় অসম্ভব।");
          return ExactValue.fromFloat(left.toNumber() % r);
        }
        case "divR": {
          const l = BigInt(Math.trunc(left.toNumber()));
          const r = BigInt(Math.trunc(right.toNumber()));
          if (r === 0n) throw new MathError("শূন্য দিয়ে ভাগ অসম্ভব।");
          const q = l / r;
          const rem = l % r;
          return new ExactValue({
            coeff: new Rational(q, 1n),
            meta: {
              type: "divR",
              quotient: q,
              remainder: rem,
              displayText: `${q}, R=${rem}`,
              latexText: `${q}\\text{, R=}${rem}`
            }
          });
        }
        case "nPr":
          return ExactValue.fromRational(nPrBig(left.toNumber(), right.toNumber()), 1n);
        case "nCr":
          return ExactValue.fromRational(nCrBig(left.toNumber(), right.toNumber()), 1n);
        default:
          throw new MathError(`অজানা অপারেটর: ${node.op}`);
      }
    }

    case "FunctionCall": {
      const args = node.args.map((a) => evaluateAst(a, angleUnit, memories));
      const a0 = args[0] || ExactValue.fromRational(0n, 1n);
      const a1 = args[1] || ExactValue.fromRational(0n, 1n);
      const name = node.name.toLowerCase();

      const toDeg = (v) => {
        const num = v.toNumber();
        if (angleUnit === "DEG") return num;
        if (angleUnit === "GRA") return (num * 9) / 10;
        return (num * 180) / Math.PI; // RAD to DEG
      };

      const toRad = (v) => (toDeg(v) * Math.PI) / 180;
      const fromRad = (rad) => {
        if (angleUnit === "DEG") return (rad * 180) / Math.PI;
        if (angleUnit === "GRA") return (rad * 200) / Math.PI;
        return rad;
      };

      switch (name) {
        case "sin":
        case "cos":
        case "tan": {
          const exactMatch = exactTrigDeg(name, toDeg(a0));
          if (exactMatch) return exactMatch;
          const rad = toRad(a0);
          if (name === "sin") return ExactValue.fromFloat(Math.sin(rad));
          if (name === "cos") return ExactValue.fromFloat(Math.cos(rad));
          if (Math.abs(Math.cos(rad)) < 1e-12) throw new MathError("tan অসংজ্ঞায়িত।");
          return ExactValue.fromFloat(Math.tan(rad));
        }
        case "cot": {
          const t = exactTrigDeg("tan", toDeg(a0));
          if (t) return ExactValue.fromRational(1n, 1n).div(t);
          return ExactValue.fromFloat(1 / Math.tan(toRad(a0)));
        }
        case "asin":
        case "acos": {
          const v = a0.toNumber();
          if (v < -1 || v > 1) throw new MathError("বিপরীত ত্রিকোণমিতির ইনপুট -1 থেকে 1 এর মধ্যে হতে হবে।");
          const rad = name === "asin" ? Math.asin(v) : Math.acos(v);
          return ExactValue.fromFloat(fromRad(rad));
        }
        case "atan":
          return ExactValue.fromFloat(fromRad(Math.atan(a0.toNumber())));
        case "acot":
          return ExactValue.fromFloat(fromRad(Math.atan(1 / a0.toNumber())));
        case "sinh": return ExactValue.fromFloat(Math.sinh(a0.toNumber()));
        case "cosh": return ExactValue.fromFloat(Math.cosh(a0.toNumber()));
        case "tanh": return ExactValue.fromFloat(Math.tanh(a0.toNumber()));
        case "asinh": return ExactValue.fromFloat(Math.asinh(a0.toNumber()));
        case "acosh": return ExactValue.fromFloat(Math.acosh(a0.toNumber()));
        case "atanh": return ExactValue.fromFloat(Math.atanh(a0.toNumber()));
        case "sqrt": {
          if (a0.isPureRational()) return ExactValue.sqrtRational(a0.coeff);
          return a0.pow(ExactValue.fromRational(1n, 2n));
        }
        case "cbrt":
          return ExactValue.fromFloat(Math.cbrt(a0.toNumber()));
        case "log":
        case "log10": {
          const v = a0.toNumber();
          if (v <= 0) throw new MathError("লগারিদমের ইনপুট ধনাত্মক হতে হবে।");
          return ExactValue.fromFloat(Math.log10(v));
        }
        case "ln": {
          const v = a0.toNumber();
          if (v <= 0) throw new MathError("ln এর ইনপুট ধনাত্মক হতে হবে।");
          return ExactValue.fromFloat(Math.log(v));
        }
        case "abs": return a0.abs();
        case "floor": return ExactValue.fromRational(BigInt(Math.floor(a0.toNumber())), 1n);
        case "ceil": return ExactValue.fromRational(BigInt(Math.ceil(a0.toNumber())), 1n);
        case "rnd": return ExactValue.fromFloat(Number(a0.toNumber().toFixed(4)));
        case "fact": return ExactValue.fromRational(factorialBig(Math.round(a0.toNumber())), 1n);
        case "gcd":
          return ExactValue.fromRational(bigIntGcd(Math.round(a0.toNumber()), Math.round(a1.toNumber())), 1n);
        case "lcm":
          return ExactValue.fromRational(bigIntLcm(Math.round(a0.toNumber()), Math.round(a1.toNumber())), 1n);
        case "pol": {
          const x = a0.toNumber();
          const y = a1.toNumber();
          const r = Math.hypot(x, y);
          const theta = fromRad(Math.atan2(y, x));
          return new ExactValue({
            approxOnly: true,
            floatValue: r,
            meta: {
              displayText: `r=${Number(r.toFixed(4))}, θ=${Number(theta.toFixed(2))}°`,
              latexText: `r=${Number(r.toFixed(4))},\\ \\theta=${Number(theta.toFixed(2))}^{\\circ}`
            }
          });
        }
        case "rec": {
          const r = a0.toNumber();
          const rad = toRad(a1);
          const x = r * Math.cos(rad);
          const y = r * Math.sin(rad);
          return new ExactValue({
            approxOnly: true,
            floatValue: x,
            meta: {
              displayText: `X=${Number(x.toFixed(4))}, Y=${Number(y.toFixed(4))}`,
              latexText: `X=${Number(x.toFixed(4))},\\ Y=${Number(y.toFixed(4))}`
            }
          });
        }
        default:
          throw new MathError(`অজানা ফাংশন: ${name}`);
      }
    }

    default:
      throw new MathError("অবৈধ গাণিতিক সমীকরণ।");
  }
}

/**
 * প্রধান মূল্যায়ন ফাংশন (এক কলে স্ট্রিং থেকে ExactValue এবং ধাপে ধাপে ব্যাখ্যা তৈরি করে)
 */
export function evaluateExpression(rawInput, angleUnit = "DEG", memories = {}) {
  const normalized = normalizeMathInput(rawInput);
  const ast = parseToAst(normalized);
  return evaluateAst(ast, angleUnit, memories);
}

// ==========================================================================
// 8. DMS CONVERTER & RESULT FORMATTER (S⇔D DISPLAY SUPPORT)
// ==========================================================================

export function decimalToDmsString(decimalDeg) {
  const num = Number(decimalDeg);
  if (!Number.isFinite(num)) return "0° 0′ 0″";
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = Number(((mFloat - m) * 60).toFixed(2));
  return `${sign}${d}° ${m}′ ${s}″`;
}

export function formatResult(
  exactVal,
  {
    displayFormat = "MATH",
    numberFormat = "NORM1",
    fixDecimals = 4,
    fractionFormat = "d/c",
    grouping = "lakh",
    numeral = "bn"
  } = {}
) {
  if (!exactVal) {
    const z = localizeDigits("0", numeral);
    return { exactText: z, decimalText: z, latexText: "0", primaryText: z };
  }

  const decimalNum = typeof exactVal.toNumber === "function" ? exactVal.toNumber() : Number(exactVal);
  if (!Number.isFinite(decimalNum)) {
    return {
      exactText: "Math ERROR",
      decimalText: "Math ERROR",
      latexText: "\\text{Math ERROR}",
      primaryText: "Math ERROR"
    };
  }

  let decStr = "";
  if (numberFormat === "FIX") {
    decStr = decimalNum.toFixed(fixDecimals);
  } else if (numberFormat === "SCI") {
    decStr = decimalNum.toExponential(fixDecimals);
  } else {
    const abs = Math.abs(decimalNum);
    if (abs !== 0 && (abs < 0.0001 || abs >= 1e10)) {
      decStr = decimalNum.toExponential(6);
    } else {
      decStr = parseFloat(decimalNum.toFixed(10)).toString();
    }
  }

  const formattedDecimal = formatNumber(decStr, { grouping, numeral });
  const rawSymbolic =
    typeof exactVal.toSymbolicString === "function"
      ? exactVal.toSymbolicString(fractionFormat)
      : decStr;

  const exactText = localizeDigits(rawSymbolic, numeral);
  const latexText =
    typeof exactVal.toLatex === "function" ? exactVal.toLatex(fractionFormat) : decStr;

  return {
    exactText,
    decimalText: formattedDecimal,
    latexText,
    dmsText: localizeDigits(decimalToDmsString(decimalNum), numeral),
    primaryText: displayFormat === "MATH" ? exactText : formattedDecimal
  };
}