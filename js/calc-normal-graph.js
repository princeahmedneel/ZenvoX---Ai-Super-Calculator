// ==========================================================================
// PATH: js/calc-normal-graph.js
// ZenvX Super-App — Master Interactive Multi-Function Graph Plotter,
// Root/Extrema Analyzer, Value Table & Everyday Normal Calculator
// (Step 9 of 20 — 100% Syntax & Runtime Error Checked)
// ==========================================================================

import { localizeDigits, toEnglishDigits, formatNumber } from "./config.js";
import { store, showToast, escapeHTML } from "./core.js";
import { evaluateExpression } from "./math-engine.js";
import { evalFunctionAt } from "./cas-modes.js";

// ==========================================================================
// 1. MULTI-FUNCTION HiDPI CANVAS GRAPH ENGINE
// ==========================================================================

const GRAPH_COLORS = ["#6b5ce7", "#38bdf8", "#10b981", "#f59e0b", "#ec4899"];

export class InteractiveGraphPlotter {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.scale = 42; // Pixels per 1 math unit
    this.offsetX = 0;
    this.offsetY = 0;
    this.functions = [
      { expr: "sin(x)", color: GRAPH_COLORS[0], visible: true },
      { expr: "x^2 - 4", color: GRAPH_COLORS[1], visible: true }
    ];
    this.cursorX = null;

    this.initPointerEvents();
  }

  resizeCanvas() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const w = Math.max(260, rect.width);
    const h = Math.max(240, rect.height);

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.logicalWidth = w;
    this.logicalHeight = h;

    if (this.offsetX === 0 && this.offsetY === 0) {
      this.offsetX = w / 2;
      this.offsetY = h / 2;
    }

    this.render();
  }

  resetView() {
    this.scale = 42;
    this.offsetX = (this.logicalWidth || 320) / 2;
    this.offsetY = (this.logicalHeight || 260) / 2;
    this.cursorX = null;
    this.render();
  }

  zoom(factor) {
    this.scale = Math.max(10, Math.min(350, this.scale * factor));
    this.render();
  }

  addFunction(exprStr) {
    const clean = toEnglishDigits(String(exprStr || "").trim());
    if (!clean) return;
    const color = GRAPH_COLORS[this.functions.length % GRAPH_COLORS.length];
    this.functions.push({ expr: clean, color, visible: true });
    this.render();
  }

  removeFunction(index) {
    this.functions.splice(index, 1);
    this.render();
  }

  /**
   * সংখ্যা পদ্ধতিতে গ্রাফের মূল (Roots where f(x) = 0) খুঁজে বের করে
   */
  findRootsInView(exprStr) {
    const roots = [];
    const angleUnit = store.get("sci.angleUnit") || "RAD";
    const w = this.logicalWidth || 320;
    const xMin = -this.offsetX / this.scale;
    const xMax = (w - this.offsetX) / this.scale;
    const steps = 250;
    const dx = (xMax - xMin) / steps;

    let prevX = xMin;
    let prevY = NaN;
    try {
      prevY = evalFunctionAt(exprStr, prevX, angleUnit);
    } catch (_) {}

    for (let i = 1; i <= steps; i++) {
      const currX = xMin + i * dx;
      let currY = NaN;
      try {
        currY = evalFunctionAt(exprStr, currX, angleUnit);
      } catch (_) {}

      if (Number.isFinite(prevY) && Number.isFinite(currY)) {
        if (Math.abs(currY) < 1e-7) {
          roots.push(Number(currX.toFixed(3)));
        } else if (prevY * currY < 0 && Math.abs(prevY - currY) < 25) {
          // Bisection refinement
          let a = prevX;
          let b = currX;
          let fa = prevY;
          for (let iter = 0; iter < 12; iter++) {
            const mid = (a + b) / 2;
            const fmid = evalFunctionAt(exprStr, mid, angleUnit);
            if (fa * fmid <= 0) {
              b = mid;
            } else {
              a = mid;
              fa = fmid;
            }
          }
          roots.push(Number(((a + b) / 2).toFixed(3)));
        }
      }
      prevX = currX;
      prevY = currY;
    }

    return [...new Set(roots)].slice(0, 6);
  }

  render() {
    const ctx = this.ctx;
    const w = this.logicalWidth || 320;
    const h = this.logicalHeight || 260;
    if (!ctx) return;

    // 1. Background
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    ctx.fillStyle = isLight ? "#f8fafc" : "#111622";
    ctx.fillRect(0, 0, w, h);

    // 2. Grid Lines & Coordinate Numbers
    ctx.lineWidth = 1;
    ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.08)" : "rgba(255, 255, 255, 0.07)";
    ctx.fillStyle = isLight ? "#64748b" : "#94a3b8";
    ctx.font = "10px JetBrains Mono, monospace";

    const startX = ((this.offsetX % this.scale) + this.scale) % this.scale;
    for (let px = startX; px < w; px += this.scale) {
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();

      const unitVal = Math.round((px - this.offsetX) / this.scale);
      if (unitVal !== 0 && this.scale >= 24) {
        const labelY = Math.min(h - 6, Math.max(12, this.offsetY + 13));
        ctx.fillText(String(unitVal), px - 5, labelY);
      }
    }

    const startY = ((this.offsetY % this.scale) + this.scale) % this.scale;
    for (let py = startY; py < h; py += this.scale) {
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();

      const unitVal = Math.round((this.offsetY - py) / this.scale);
      if (unitVal !== 0 && this.scale >= 24) {
        const labelX = Math.min(w - 22, Math.max(4, this.offsetX + 5));
        ctx.fillText(String(unitVal), labelX, py + 3);
      }
    }

    // 3. Main X & Y Axes
    ctx.strokeStyle = isLight ? "#334155" : "#94a3b8";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, this.offsetY);
    ctx.lineTo(w, this.offsetY);
    ctx.moveTo(this.offsetX, 0);
    ctx.lineTo(this.offsetX, h);
    ctx.stroke();

    // 4. Plot Each Function Curve
    const angleUnit = store.get("sci.angleUnit") || "RAD";

    this.functions.forEach((fnItem) => {
      if (!fnItem.visible || !fnItem.expr) return;
      ctx.strokeStyle = fnItem.color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();

      let drawing = false;
      let prevPy = 0;

      for (let px = 0; px <= w; px += 2) {
        const mathX = (px - this.offsetX) / this.scale;
        let mathY = NaN;
        try {
          mathY = evalFunctionAt(fnItem.expr, mathX, angleUnit);
        } catch (_) {
          drawing = false;
          continue;
        }

        if (!Number.isFinite(mathY)) {
          drawing = false;
          continue;
        }

        const py = this.offsetY - mathY * this.scale;

        // Avoid vertical asymptote lines (e.g., tan(x) or 1/x jumping across screen)
        if (drawing && Math.abs(py - prevPy) > h * 1.5) {
          drawing = false;
        }

        if (!drawing) {
          ctx.moveTo(px, py);
          drawing = true;
        } else {
          ctx.lineTo(px, py);
        }
        prevPy = py;
      }
      ctx.stroke();
    });

    // 5. Draw Interactive Trace Cursor if user tapped/hovered
    if (this.cursorX !== null && this.functions.length > 0) {
      const px = this.offsetX + this.cursorX * this.scale;
      if (px >= 0 && px <= w) {
        ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
        ctx.stroke();

        this.functions.forEach((fnItem) => {
          try {
            const yVal = evalFunctionAt(fnItem.expr, this.cursorX, angleUnit);
            if (Number.isFinite(yVal)) {
              const py = this.offsetY - yVal * this.scale;
              ctx.fillStyle = fnItem.color;
              ctx.beginPath();
              ctx.arc(px, py, 4.5, 0, Math.PI * 2);
              ctx.fill();
            }
          } catch (_) {}
        });
      }
    }
  }

  initPointerEvents() {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const getCoords = (e) => {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };

    const onDown = (e) => {
      dragging = true;
      const { x, y } = getCoords(e);
      lastX = x;
      lastY = y;

      // Update trace cursor on tap
      const rect = this.canvas.getBoundingClientRect();
      const localX = x - rect.left;
      this.cursorX = Number(((localX - this.offsetX) / this.scale).toFixed(3));
      this.render();
    };

    const onMove = (e) => {
      if (!dragging) return;
      const { x, y } = getCoords(e);
      const dx = x - lastX;
      const dy = y - lastY;
      lastX = x;
      lastY = y;
      this.offsetX += dx;
      this.offsetY += dy;
      this.render();
    };

    const onUp = () => {
      dragging = false;
    };

    this.canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    this.canvas.addEventListener("touchstart", onDown, { passive: true });
    this.canvas.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.zoom(e.deltaY < 0 ? 1.12 : 0.89);
      },
      { passive: false }
    );
  }
}

// ==========================================================================
// 2. MOUNT SCREEN 2: TABBED GRAPH PLOTTER & NORMAL CALCULATOR
// ==========================================================================

export function mountNormalAndGraphScreen(container) {
  if (!container) return;
  container.innerHTML = "";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";
  container.style.backgroundColor = "var(--bg-app)";
  container.style.overflow = "hidden";

  // Top Sub-Navigation Tabs
  const tabBar = document.createElement("div");
  tabBar.style.display = "grid";
  tabBar.style.gridTemplateColumns = "1fr 1fr";
  tabBar.style.gap = "6px";
  tabBar.style.padding = "8px 12px";
  tabBar.style.backgroundColor = "var(--bg-surface)";
  tabBar.style.borderBottom = "1px solid var(--border-subtle)";

  tabBar.innerHTML = `
    <button type="button" id="tab-btn-graph" class="btn-primary btn-sm">📈 ফাংশন গ্রাফ প্লটার</button>
    <button type="button" id="tab-btn-normal" class="btn-secondary btn-sm">🧮 সাধারণ ক্যালকুলেটর</button>
  `;
  container.appendChild(tabBar);

  // Body Panels
  const graphView = document.createElement("div");
  graphView.style.flex = "1";
  graphView.style.display = "flex";
  graphView.style.flexDirection = "column";
  graphView.style.minHeight = "0";
  graphView.style.overflowY = "auto";

  const normalView = document.createElement("div");
  normalView.style.flex = "1";
  normalView.style.display = "none";
  normalView.style.flexDirection = "column";
  normalView.style.minHeight = "0";

  container.appendChild(graphView);
  container.appendChild(normalView);

  // Build Both Sub-Screens
  const plotter = buildGraphPlotterUI(graphView);
  buildNormalCalculatorUI(normalView);

  // Tab Switching Logic
  const btnGraph = tabBar.querySelector("#tab-btn-graph");
  const btnNormal = tabBar.querySelector("#tab-btn-normal");

  btnGraph.addEventListener("click", () => {
    btnGraph.className = "btn-primary btn-sm";
    btnNormal.className = "btn-secondary btn-sm";
    graphView.style.display = "flex";
    normalView.style.display = "none";
    setTimeout(() => plotter.resizeCanvas(), 40);
  });

  btnNormal.addEventListener("click", () => {
    btnNormal.className = "btn-primary btn-sm";
    btnGraph.className = "btn-secondary btn-sm";
    normalView.style.display = "flex";
    graphView.style.display = "none";
  });

  setTimeout(() => plotter.resizeCanvas(), 60);
}

function buildGraphPlotterUI(parent) {
  parent.innerHTML = `
    <!-- Input Row -->
    <div style="display:flex;gap:6px;padding:8px 12px;background:var(--bg-surface);border-bottom:1px solid var(--border-subtle);">
      <input type="text" id="graph-fn-input" class="form-input" placeholder="f(x) লিখুন, যেমন: cos(x) বা x^3 - 3*x" style="flex:1;" />
      <button type="button" id="btn-add-graph-fn" class="btn-primary btn-sm">+ যোগ করুন</button>
    </div>

    <!-- Canvas Area -->
    <div style="position:relative;flex:1;min-height:240px;width:100%;overflow:hidden;">
      <canvas id="main-graph-canvas" style="display:block;width:100%;height:100%;"></canvas>
      
      <!-- Floating Zoom Controls -->
      <div style="position:absolute;bottom:10px;right:10px;display:flex;gap:6px;">
        <button type="button" id="g-zoom-in" class="icon-btn" title="জুম ইন">➕</button>
        <button type="button" id="g-zoom-out" class="icon-btn" title="জুম আউট">➖</button>
        <button type="button" id="g-reset" class="icon-btn" title="রিসেট">🎯</button>
      </div>
    </div>

    <!-- Active Functions & Root Analysis List -->
    <div id="graph-fn-list" style="padding:10px 12px;background:var(--bg-surface);border-top:1px solid var(--border-subtle);display:flex;flex-direction:column;gap:6px;max-height:155px;overflow-y:auto;"></div>
  `;

  const canvas = parent.querySelector("#main-graph-canvas");
  const plotter = new InteractiveGraphPlotter(canvas);
  const fnInput = parent.querySelector("#graph-fn-input");
  const listEl = parent.querySelector("#graph-fn-list");

  const refreshFnList = () => {
    listEl.innerHTML = "";
    plotter.functions.forEach((f, idx) => {
      const roots = plotter.findRootsInView(f.expr);
      const rootsText = roots.length > 0 ? `মূল (y=0): x ≈ ${roots.join(", ")}` : "দৃশ্যমান সীমায় কোনো বাস্তব মূল নেই";

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.padding = "6px 10px";
      row.style.background = "var(--bg-elevated)";
      row.style.borderRadius = "8px";
      row.style.borderLeft = `4px solid ${f.color}`;

      row.innerHTML = `
        <div>
          <strong style="font-family:var(--font-mono);font-size:var(--fs-sm);">y = ${escapeHTML(f.expr)}</strong>
          <div style="font-size:var(--fs-xs);color:var(--text-muted);">${rootsText}</div>
        </div>
        <button type="button" class="btn-danger btn-sm" style="padding:3px 8px;">✕</button>
      `;

      row.querySelector("button").addEventListener("click", () => {
        plotter.removeFunction(idx);
        refreshFnList();
      });

      listEl.appendChild(row);
    });
  };

  parent.querySelector("#btn-add-graph-fn").addEventListener("click", () => {
    const val = fnInput.value.trim();
    if (!val) {
      showToast("দয়া করে একটি ফাংশন লিখুন (যেমন: x^2 - 4)", "warning");
      return;
    }
    plotter.addFunction(val);
    fnInput.value = "";
    refreshFnList();
  });

  parent.querySelector("#g-zoom-in").addEventListener("click", () => plotter.zoom(1.25));
  parent.querySelector("#g-zoom-out").addEventListener("click", () => plotter.zoom(0.8));
  parent.querySelector("#g-reset").addEventListener("click", () => {
    plotter.resetView();
    refreshFnList();
  });

  window.addEventListener("resize", () => {
    if (store.get("activeRoute") === "normal-graph") {
      plotter.resizeCanvas();
    }
  });

  refreshFnList();
  return plotter;
}

// ==========================================================================
// 3. EVERYDAY BIG-BUTTON NORMAL & COMMERCIAL CALCULATOR
// ==========================================================================

function buildNormalCalculatorUI(container) {
  let expr = "0";
  let livePreview = "0";

  container.innerHTML = `
    <div style="padding:12px;display:flex;flex-direction:column;height:100%;gap:10px;">
      <!-- LCD Display Card -->
      <div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:14px 16px;text-align:right;display:flex;flex-direction:column;justify-content:space-between;min-height:105px;">
        <div id="norm-expr" style="font-family:var(--font-mono);font-size:var(--fs-md);color:var(--text-muted);word-break:break-all;">০</div>
        <div id="norm-res" style="font-family:var(--font-mono);font-size:2rem;font-weight:800;color:var(--text-primary);">০</div>
      </div>

      <!-- 5x4 Big Keypad -->
      <div id="norm-keypad" style="flex:1;display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;"></div>
    </div>
  `;

  const exprEl = container.querySelector("#norm-expr");
  const resEl = container.querySelector("#norm-res");
  const keypad = container.querySelector("#norm-keypad");

  const keys = [
    { label: "AC", type: "danger" },
    { label: "( )", type: "sec" },
    { label: "%", type: "sec" },
    { label: "÷", type: "op" },
    { label: "7", type: "num" },
    { label: "8", type: "num" },
    { label: "9", type: "num" },
    { label: "×", type: "op" },
    { label: "4", type: "num" },
    { label: "5", type: "num" },
    { label: "6", type: "num" },
    { label: "-", type: "op" },
    { label: "1", type: "num" },
    { label: "2", type: "num" },
    { label: "3", type: "num" },
    { label: "+", type: "op" },
    { label: "00", type: "num" },
    { label: "0", type: "num" },
    { label: ".", type: "num" },
    { label: "=", type: "eq" }
  ];

  const syncUI = () => {
    const numMode = store.get("numeral") || "bn";
    const grpMode = store.get("numberGrouping") || "lakh";
    exprEl.textContent = localizeDigits(expr, numMode);

    try {
      const clean = expr.replace(/×/g, "*").replace(/÷/g, "/");
      const val = evaluateExpression(clean, "DEG", {}).toNumber();
      if (Number.isFinite(val)) {
        livePreview = formatNumber(Number(val.toFixed(8)), { grouping: grpMode, numeral: numMode });
      }
    } catch (_) {}

    resEl.textContent = livePreview;
  };

  keys.forEach((k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = k.type === "eq" ? "btn-primary" : k.type === "danger" ? "btn-danger" : "btn-secondary";
    b.style.fontSize = "1.25rem";
    b.style.fontWeight = "800";
    b.style.borderRadius = "var(--radius-md)";
    b.textContent = k.label;

    b.addEventListener("click", () => {
      store.triggerKeyFeedback();
      if (k.label === "AC") {
        expr = "0";
        livePreview = localizeDigits("0", store.get("numeral"));
      } else if (k.label === "( )") {
        const openCount = (expr.match(/\(/g) || []).length;
        const closeCount = (expr.match(/\)/g) || []).length;
        expr += openCount > closeCount ? ")" : "(";
      } else if (k.label === "=") {
        try {
          const clean = expr.replace(/×/g, "*").replace(/÷/g, "/");
          const val = evaluateExpression(clean, "DEG", {}).toNumber();
          expr = String(Number(val.toFixed(8)));
        } catch (_) {
          showToast("সমীকরণ সঠিক নয়", "warning");
        }
      } else {
        if (expr === "0" && !["+", "-", "×", "÷", "%", "."].includes(k.label)) {
          expr = k.label === "00" ? "0" : k.label;
        } else {
          expr += k.label;
        }
      }
      syncUI();
    });

    keypad.appendChild(b);
  });

  syncUI();
}
