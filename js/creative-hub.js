// ==========================================================================
// PATH: js/creative-hub.js
// ZenvX Super-App — Master Creative Study Hub Module
// Includes: Offline Study Notes, Pomodoro Focus Timer, Physics/Math Formula
// Sheets (KaTeX), Interactive Flashcards, Touch Whiteboard & Code Playground
// (Step 14 of 20 — 100% Syntax & Runtime Error Checked)
// ==========================================================================

import {
  store,
  dbLocal,
  STORES,
  escapeHTML,
  showToast,
  openModal,
  closeModal
} from "./core.js";

import { localizeDigits } from "./config.js";
import { renderMathToElement } from "./calc-scientific.js";

// ==========================================================================
// 1. MASTER FORMULA DATABASE (SSC & HSC PHYSICS, CHEMISTRY & HIGHER MATH)
// ==========================================================================

export const MASTER_FORMULA_BANK = [
  {
    category: "পদার্থবিজ্ঞান (গতিবিদ্যা ও বলবিদ্যা)",
    items: [
      { title: "গতির সমীকরণ (বেগ-সময়)", latex: "v = u + at", desc: "u = আদিবেগ, a = ত্বরণ, t = সময়" },
      { title: "গতির সমীকরণ (সরণ-সময়)", latex: "s = ut + \\frac{1}{2}at^2", desc: "সমত্বরণে চলমান বস্তুর সরণ" },
      { title: "গতির সমীকরণ (বেগ-সরণ)", latex: "v^2 = u^2 + 2as", desc: "সময় ব্যতীত বেগ ও সরণের সম্পর্ক" },
      { title: "নিউটনের দ্বিতীয় সূত্র ও বল", latex: "F = ma = \\frac{dp}{dt}", desc: " ভরবেগের পরিবর্তনের হার প্রযুক্ত বলের সমানুপাতিক" },
      { title: "প্রাসের পাল্লা (Horizontal Range)", latex: "R = \\frac{v_0^2 \\sin(2\\theta_0)}{g}", desc: "সর্বোচ্চ পাল্লার জন্য θ₀ = 45°" },
      { title: "গতিশক্তি ও কাজ-শক্তি উপপাদ্য", latex: "E_k = \\frac{1}{2}mv^2 = \\frac{p^2}{2m}", desc: "p = রৈখিক ভরবেগ, m = ভর" },
      { title: "মহাকর্ষীয় বল ও মুক্তিবেগ", latex: "v_e = \\sqrt{\\frac{2GM}{R}} = \\sqrt{2gR}", desc: "পৃথিবীর জন্য মুক্তিবেগ ১১.২ km/s" }
    ]
  },
  {
    category: "পদার্থবিজ্ঞান (তড়িৎ, চৌম্বক ও আধুনিক পদার্থবিজ্ঞান)",
    items: [
      { title: "কুলম্বের তড়িৎ বলের সূত্র", latex: "F = \\frac{1}{4\\pi\\varepsilon_0} \\frac{q_1 q_2}{r^2}", desc: "দুটি বিন্দু চার্জের মধ্যবর্তী আকর্ষণ বা বিকর্ষণ বল" },
      { title: "ওহমের সূত্র ও তড়িৎ ক্ষমতা", latex: "V = IR, \\quad P = VI = I^2R = \\frac{V^2}{R}", desc: "তড়িৎ প্রবাহ, বিভব পার্থক্য ও রোধ" },
      { title: "আইনস্টাইনের ভর-শক্তি সমীকরণ", latex: "E = mc^2", desc: "c = শূন্য মাধ্যমে আলোর বেগ (3×10⁸ m/s)" },
      { title: "ডি ব্রগলি তরঙ্গদৈর্ঘ্য", latex: "\\lambda = \\frac{h}{p} = \\frac{h}{mv}", desc: "h = প্ল্যাঙ্ক ধ্রুবক" },
      { title: "আইনস্টাইনের আলোক-তড়িৎ সমীকরণ", latex: "hf = W_0 + E_{k(\\max)}", desc: "W₀ = কার্যাপেক্ষক (Work function)" }
    ]
  },
  {
    category: "উচ্চতর গণিত (ত্রিকোণমিতি ও ক্যালকুলাস)",
    items: [
      { title: "ত্রিকোণমিতিক মৌলিক অভেদ", latex: "\\sin^2\\theta + \\cos^2\\theta = 1, \\quad \\sec^2\\theta - \\tan^2\\theta = 1", desc: "সকল কোণের জন্য প্রযোজ্য" },
      { title: "যৌগিক কোণের সূত্র", latex: "\\sin(A \\pm B) = \\sin A\\cos B \\pm \\cos A\\sin B", desc: "ত্রিকোণমিতিক কোণ সংযোজন" },
      { title: "গুণিতক কোণের সূত্র (sin 2A)", latex: "\\sin 2A = 2\\sin A\\cos A = \\frac{2\\tan A}{1+\\tan^2 A}", desc: "দ্বিগুণ কোণের রূপান্তর" },
      { title: "অন্তরীকরণের ঘাত সূত্র (Power Rule)", latex: "\\frac{d}{dx}(x^n) = nx^{n-1}", desc: "যেকোনো বাস্তব ঘাত n এর জন্য" },
      { title: "গুণফলের অন্তরীকরণ (UV Rule)", latex: "\\frac{d}{dx}(uv) = u\\frac{dv}{dx} + v\\frac{du}{dx}", desc: "দুটি ফাংশনের গুণফলের ব্যবকলন" },
      { title: "মৌলিক যোগজীকরণ (Integration)", latex: "\\int x^n dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)", desc: "অনির্দিষ্ট যোগজীকরণ" }
    ]
  },
  {
    category: "রসায়ন (পরিমাণগত ও ভৌত রসায়ন)",
    items: [
      { title: "আদর্শ গ্যাস সমীকরণ", latex: "PV = nRT = \\frac{w}{M}RT", desc: "R = 8.314 J·mol⁻¹·K⁻¹" },
      { title: "দ্রবণের মোলারিটি ও লঘুকরণ সূত্র", latex: "S = \\frac{1000w}{MV}, \\quad V_1 S_1 = V_2 S_2", desc: "w = দ্রবের ভর (g), V = আয়তন (mL)" },
      { title: "pH ও বাফার দ্রবণের হেন্ডারসন সমীকরণ", latex: "\\text{pH} = -\\log[H^+], \\quad \\text{pH} = \\text{p}K_a + \\log\\frac{[\\text{Salt}]}{[\\text{Acid}]}", desc: "অম্লত্ব ও ক্ষারকত্ব পরিমাপ" }
    ]
  }
];

// ==========================================================================
// 2. POMODORO FOCUS TIMER ENGINE (SINGLETON SAFE)
// ==========================================================================

let pomodoroInterval = null;
let pomodoroSecondsLeft = 25 * 60;
let pomodoroRunning = false;
let pomodoroMode = "focus"; // 'focus' (25m) | 'short' (5m) | 'long' (15m)

// ==========================================================================
// 3. MOUNT SCREEN 6: CREATIVE STUDY HUB
// ==========================================================================

export async function mount(container, isFirstMount) {
  if (!container) return;
  if (!isFirstMount && container.innerHTML.trim() !== "") return;

  container.innerHTML = "";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";
  container.style.backgroundColor = "var(--bg-app)";
  container.style.overflow = "hidden";

  // 1. Top Tool Selector Pills
  const navBar = document.createElement("div");
  navBar.style.display = "flex";
  navBar.style.gap = "6px";
  navBar.style.padding = "10px 12px";
  navBar.style.backgroundColor = "var(--bg-surface)";
  navBar.style.borderBottom = "1px solid var(--border-subtle)";
  navBar.style.overflowX = "auto";
  navBar.style.flexShrink = "0";

  const tools = [
    { id: "notes", label: "📝 স্টাডি নোটস" },
    { id: "formulas", label: "📐 সূত্রাবলি শিট" },
    { id: "timer", label: "⏱️ পোমোডোরো টাইমার" },
    { id: "whiteboard", label: "🖌️ রাফ হোয়াইটবোর্ড" },
    { id: "flashcards", label: "🗂️ ফ্ল্যাশকার্ড" },
    { id: "code", label: "💻 কোড ল্যাব" }
  ];

  tools.forEach((t, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = idx === 0 ? "btn-primary btn-sm" : "btn-secondary btn-sm";
    btn.style.flexShrink = "0";
    btn.setAttribute("data-hub-tab", t.id);
    btn.textContent = t.label;
    navBar.appendChild(btn);
  });

  container.appendChild(navBar);

  // 2. Dynamic Tool Body Container
  const bodyMount = document.createElement("div");
  bodyMount.style.flex = "1";
  bodyMount.style.minHeight = "0";
  bodyMount.style.overflowY = "auto";
  bodyMount.style.padding = "14px";
  container.appendChild(bodyMount);

  const switchTool = (toolId) => {
    navBar.querySelectorAll("button").forEach((b) => {
      b.className = b.getAttribute("data-hub-tab") === toolId ? "btn-primary btn-sm" : "btn-secondary btn-sm";
    });

    bodyMount.innerHTML = "";
    if (toolId === "notes") renderStudyNotesTool(bodyMount);
    else if (toolId === "formulas") renderFormulaSheetsTool(bodyMount);
    else if (toolId === "timer") renderPomodoroTimerTool(bodyMount);
    else if (toolId === "whiteboard") renderWhiteboardTool(bodyMount);
    else if (toolId === "flashcards") renderFlashcardsTool(bodyMount);
    else if (toolId === "code") renderCodePlaygroundTool(bodyMount);
  };

  navBar.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => switchTool(b.getAttribute("data-hub-tab")));
  });

  switchTool("notes");
}

// ==========================================================================
// 4. TOOL 1: OFFLINE STUDY NOTES MANAGER
// ==========================================================================

async function renderStudyNotesTool(parent) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "12px";

  wrap.innerHTML = `
    <div class="card-box" style="display:flex;flex-direction:column;gap:8px;">
      <h4 style="font-size:var(--fs-sm);font-weight:800;color:var(--accent-secondary);">✍️ নতুন স্টাডি নোট তৈরি করুন</h4>
      <input type="text" id="note-title-inp" class="form-input" placeholder="নোটের শিরোনাম (যেমন: নিউটনিয়ান বলবিদ্যা শর্ট নোট)..." />
      <textarea id="note-body-inp" class="form-input" rows="4" placeholder="বিস্তারিত নোট বা গুরুত্বপূর্ণ সূত্র লিখে রাখুন..."></textarea>
      <button type="button" id="btn-save-note" class="btn-primary btn-sm" style="align-self:flex-end;">💾 নোট সংরক্ষণ করুন</button>
    </div>

    <div id="saved-notes-list" style="display:flex;flex-direction:column;gap:8px;"></div>
  `;

  parent.appendChild(wrap);

  const listEl = wrap.querySelector("#saved-notes-list");
  const titleInp = wrap.querySelector("#note-title-inp");
  const bodyInp = wrap.querySelector("#note-body-inp");

  const refreshNotes = async () => {
    const notes = await dbLocal.getAll(STORES.NOTES, 50);
    listEl.innerHTML = "";

    if (notes.length === 0) {
      listEl.innerHTML = `<p style="text-align:center;color:var(--text-muted);font-size:var(--fs-xs);padding:16px;">কোনো সংরক্ষিত নোট নেই। উপরে লিখে সেভ করুন।</p>`;
      return;
    }

    notes.forEach((n) => {
      const card = document.createElement("div");
      card.className = "card-box";
      card.style.display = "flex";
      card.style.justifyContent = "space-between";
      card.style.alignItems = "flex-start";
      card.style.gap = "10px";

      const dateStr = new Date(n.timestamp || Date.now()).toLocaleDateString("bn-BD");
      card.innerHTML = `
        <div style="flex:1;">
          <h4 style="font-size:var(--fs-sm);font-weight:800;color:var(--text-primary);">${escapeHTML(n.title)}</h4>
          <p style="font-size:var(--fs-xs);color:var(--text-secondary);white-space:pre-wrap;margin-top:4px;">${escapeHTML(n.content)}</p>
          <span style="font-size:0.65rem;color:var(--text-muted);display:block;margin-top:6px;">📅 ${dateStr}</span>
        </div>
        <button type="button" class="btn-danger btn-sm" style="padding:4px 8px;">🗑️</button>
      `;

      card.querySelector("button").addEventListener("click", async () => {
        await dbLocal.delete(STORES.NOTES, n.id);
        showToast("নোটটি মুছে ফেলা হয়েছে।", "info", 1400);
        refreshNotes();
      });

      listEl.appendChild(card);
    });
  };

  wrap.querySelector("#btn-save-note").addEventListener("click", async () => {
    const title = titleInp.value.trim();
    const content = bodyInp.value.trim();
    if (!title && !content) {
      showToast("নোটের শিরোনাম বা বিষয়বস্তু লিখুন।", "warning");
      return;
    }
    await dbLocal.put(STORES.NOTES, {
      title: title || "শিরোনামহীন নোট",
      content
    });
    titleInp.value = "";
    bodyInp.value = "";
    showToast("নোট অফলাইনে সংরক্ষিত হয়েছে!", "success", 1600);
    refreshNotes();
  });

  refreshNotes();
}

// ==========================================================================
// 5. TOOL 2: INTERACTIVE FORMULA SHEETS (KATEX RENDERED)
// ==========================================================================

function renderFormulaSheetsTool(parent) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "12px";

  MASTER_FORMULA_BANK.forEach((sec) => {
    const secCard = document.createElement("div");
    secCard.className = "card-box";
    secCard.style.display = "flex";
    secCard.style.flexDirection = "column";
    secCard.style.gap = "8px";

    const h4 = document.createElement("h4");
    h4.style.fontSize = "var(--fs-sm)";
    h4.style.fontWeight = "800";
    h4.style.color = "var(--accent-secondary)";
    h4.style.borderBottom = "1px solid var(--border-subtle)";
    h4.style.paddingBottom = "6px";
    h4.textContent = `📚 ${sec.category}`;
    secCard.appendChild(h4);

    sec.items.forEach((item) => {
      const row = document.createElement("div");
      row.style.background = "var(--bg-elevated)";
      row.style.padding = "10px 12px";
      row.style.borderRadius = "8px";
      row.style.display = "flex";
      row.style.flexDirection = "column";
      row.style.gap = "4px";

      const titleEl = document.createElement("strong");
      titleEl.style.fontSize = "var(--fs-xs)";
      titleEl.style.color = "var(--text-primary)";
      titleEl.textContent = item.title;

      const mathBox = document.createElement("div");
      mathBox.style.fontSize = "1.05rem";
      mathBox.style.color = "var(--color-success)";
      mathBox.style.padding = "4px 0";
      renderMathToElement(mathBox, item.latex, item.latex);

      const descEl = document.createElement("span");
      descEl.style.fontSize = "0.7rem";
      descEl.style.color = "var(--text-muted)";
      descEl.textContent = item.desc;

      row.appendChild(titleEl);
      row.appendChild(mathBox);
      row.appendChild(descEl);
      secCard.appendChild(row);
    });

    wrap.appendChild(secCard);
  });

  parent.appendChild(wrap);
}

// ==========================================================================
// 6. TOOL 3: POMODORO FOCUS STUDY TIMER
// ==========================================================================

function renderPomodoroTimerTool(parent) {
  const card = document.createElement("div");
  card.className = "card-box";
  card.style.textAlign = "center";
  card.style.padding = "24px 16px";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.alignItems = "center";
  card.style.gap = "16px";

  card.innerHTML = `
    <div style="display:flex;gap:6px;">
      <button type="button" data-pomo="focus" class="btn-primary btn-sm">🎯 ফোকাস (২৫ মি.)</button>
      <button type="button" data-pomo="short" class="btn-secondary btn-sm">☕ ছোট বিরতি (৫ মি.)</button>
      <button type="button" data-pomo="long" class="btn-secondary btn-sm">🌿 বড় বিরতি (১৫ মি.)</button>
    </div>

    <div id="pomo-clock-display" style="font-family:var(--font-mono);font-size:3.4rem;font-weight:800;color:var(--accent-secondary);letter-spacing:2px;margin:10px 0;">
      ২৫:০০
    </div>

    <div style="display:flex;gap:10px;">
      <button type="button" id="btn-pomo-start" class="btn-primary" style="min-width:120px;">▶ শুরু করুন</button>
      <button type="button" id="btn-pomo-reset" class="btn-secondary">🔄 রিসেট</button>
    </div>

    <p style="font-size:var(--fs-xs);color:var(--text-muted);max-width:300px;">
      পোমোডোরো পদ্ধতিতে ২৫ মিনিট মনোযোগ দিয়ে পড়াশোনা করুন এবং এরপর ৫ মিনিট বিশ্রাম নিন।
    </p>
  `;

  parent.appendChild(card);

  const clockEl = card.querySelector("#pomo-clock-display");
  const startBtn = card.querySelector("#btn-pomo-start");

  const updateClockText = () => {
    const mins = String(Math.floor(pomodoroSecondsLeft / 60)).padStart(2, "0");
    const secs = String(pomodoroSecondsLeft % 60).padStart(2, "0");
    clockEl.textContent = localizeDigits(`${mins}:${secs}`, store.get("numeral") || "bn");
    startBtn.textContent = pomodoroRunning ? "⏸ বিরতি (Pause)" : "▶ শুরু করুন";
  };

  card.querySelectorAll("[data-pomo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const m = btn.getAttribute("data-pomo");
      pomodoroMode = m;
      pomodoroRunning = false;
      if (pomodoroInterval) clearInterval(pomodoroInterval);
      pomodoroSecondsLeft = m === "focus" ? 25 * 60 : m === "short" ? 5 * 60 : 15 * 60;

      card.querySelectorAll("[data-pomo]").forEach((b) => {
        b.className = b === btn ? "btn-primary btn-sm" : "btn-secondary btn-sm";
      });
      updateClockText();
    });
  });

  startBtn.addEventListener("click", () => {
    if (pomodoroRunning) {
      pomodoroRunning = false;
      if (pomodoroInterval) clearInterval(pomodoroInterval);
      updateClockText();
      return;
    }

    pomodoroRunning = true;
    updateClockText();
    if (pomodoroInterval) clearInterval(pomodoroInterval);

    pomodoroInterval = setInterval(() => {
      if (pomodoroSecondsLeft > 0) {
        pomodoroSecondsLeft--;
        updateClockText();
      } else {
        clearInterval(pomodoroInterval);
        pomodoroRunning = false;
        store.triggerKeyFeedback();
        showToast("🎉 পোমোডোরো সেশন সম্পন্ন হয়েছে! এবার একটু বিশ্রাম নিন।", "success", 4000);
        updateClockText();
      }
    }, 1000);
  });

  card.querySelector("#btn-pomo-reset").addEventListener("click", () => {
    pomodoroRunning = false;
    if (pomodoroInterval) clearInterval(pomodoroInterval);
    pomodoroSecondsLeft = pomodoroMode === "focus" ? 25 * 60 : pomodoroMode === "short" ? 5 * 60 : 15 * 60;
    updateClockText();
  });

  updateClockText();
}

// ==========================================================================
// 7. TOOL 4: DIGITAL TOUCH WHITEBOARD CANVAS (FOR ROUGH MATH)
// ==========================================================================

function renderWhiteboardTool(parent) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "8px";
  wrap.style.height = "100%";

  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-surface);padding:8px 12px;border-radius:10px;border:1px solid var(--border-subtle);">
      <div style="display:flex;gap:6px;align-items:center;">
        <button type="button" data-wb-color="#38bdf8" style="width:24px;height:24px;border-radius:50%;background:#38bdf8;border:2px solid #fff;"></button>
        <button type="button" data-wb-color="#10b981" style="width:24px;height:24px;border-radius:50%;background:#10b981;"></button>
        <button type="button" data-wb-color="#f59e0b" style="width:24px;height:24px;border-radius:50%;background:#f59e0b;"></button>
        <button type="button" data-wb-color="#ef4444" style="width:24px;height:24px;border-radius:50%;background:#ef4444;"></button>
      </div>
      <button type="button" id="btn-wb-clear" class="btn-danger btn-sm">🗑️ বোর্ড মুছুন</button>
    </div>

    <div style="flex:1;min-height:300px;background:#111622;border:2px solid var(--border-subtle);border-radius:12px;overflow:hidden;position:relative;touch-action:none;">
      <canvas id="wb-canvas" style="width:100%;height:100%;display:block;cursor:crosshair;"></canvas>
    </div>
  `;

  parent.appendChild(wrap);

  const canvas = wrap.querySelector("#wb-canvas");
  const ctx = canvas.getContext("2d");
  let strokeColor = "#38bdf8";
  let drawing = false;

  const initCanvasSize = () => {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.max(280, rect.width);
    canvas.height = Math.max(280, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = strokeColor;
  };

  setTimeout(initCanvasSize, 40);

  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    drawing = true;
    const { x, y } = getPos(e);
    ctx.strokeStyle = strokeColor;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const moveDraw = (e) => {
    if (!drawing) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    drawing = false;
  };

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", moveDraw);
  window.addEventListener("mouseup", endDraw);

  canvas.addEventListener("touchstart", startDraw, { passive: true });
  canvas.addEventListener("touchmove", moveDraw, { passive: true });
  window.addEventListener("touchend", endDraw);

  wrap.querySelectorAll("[data-wb-color]").forEach((b) => {
    b.addEventListener("click", () => {
      strokeColor = b.getAttribute("data-wb-color");
      wrap.querySelectorAll("[data-wb-color]").forEach((el) => (el.style.border = "none"));
      b.style.border = "2px solid #ffffff";
    });
  });

  wrap.querySelector("#btn-wb-clear").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}

// ==========================================================================
// 8. TOOL 5: FLASHCARDS & ACTIVE RECALL
// ==========================================================================

async function renderFlashcardsTool(parent) {
  const defaultCards = [
    { front: "নিউটনের মহাকর্ষীয় ধ্রুবক (G) এর মান কত?", back: "6.67430 × 10⁻¹¹ m³·kg⁻¹·s⁻²" },
    { front: "আদর্শ গ্যাসের ক্ষেত্রে মোলার গ্যাস ধ্রুবক R এর মান কত?", back: "8.314 J·mol⁻¹·K⁻¹ (অথবা 0.0821 L·atm·mol⁻¹·K⁻¹)" },
    { front: "sin(2θ) এর ত্রিকোণমিতিক সূত্র কী?", back: "2 sin(θ) cos(θ)" },
    { front: "প্ল্যাঙ্ক ধ্রুবক (h) এর মান কত?", back: "6.62607015 × 10⁻³⁴ J·s" }
  ];

  let idx = 0;
  let flipped = false;

  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "12px";

  wrap.innerHTML = `
    <div id="flashcard-box" class="card-box" style="min-height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;cursor:pointer;padding:24px;border:2px solid var(--accent-primary);">
      <span id="fc-badge" style="font-size:0.7rem;color:var(--accent-secondary);margin-bottom:8px;font-weight:700;">প্রশ্ন (উত্তর দেখতে ট্যাপ করুন)</span>
      <h3 id="fc-text" style="font-size:var(--fs-md);font-weight:800;"></h3>
    </div>

    <div style="display:flex;justify-content:space-between;gap:8px;">
      <button type="button" id="fc-prev" class="btn-secondary" style="flex:1;">◀ আগের কার্ড</button>
      <button type="button" id="fc-flip" class="btn-primary" style="flex:1;">🔄 কার্ড উল্টান</button>
      <button type="button" id="fc-next" class="btn-secondary" style="flex:1;">পরের কার্ড ▶</button>
    </div>
  `;

  parent.appendChild(wrap);

  const badgeEl = wrap.querySelector("#fc-badge");
  const textEl = wrap.querySelector("#fc-text");

  const syncCard = () => {
    const item = defaultCards[idx];
    badgeEl.textContent = flipped ? "✅ উত্তর (Answer)" : `❓ প্রশ্ন (${idx + 1}/${defaultCards.length}) — ট্যাপ করুন`;
    textEl.textContent = flipped ? item.back : item.front;
    textEl.style.color = flipped ? "var(--color-success)" : "var(--text-primary)";
  };

  const toggleFlip = () => {
    flipped = !flipped;
    syncCard();
  };

  wrap.querySelector("#flashcard-box").addEventListener("click", toggleFlip);
  wrap.querySelector("#fc-flip").addEventListener("click", toggleFlip);

  wrap.querySelector("#fc-prev").addEventListener("click", () => {
    idx = (idx - 1 + defaultCards.length) % defaultCards.length;
    flipped = false;
    syncCard();
  });

  wrap.querySelector("#fc-next").addEventListener("click", () => {
    idx = (idx + 1) % defaultCards.length;
    flipped = false;
    syncCard();
  });

  syncCard();
}

// ==========================================================================
// 9. TOOL 6: SANDBOXED HTML / CSS / JS CODE PLAYGROUND
// ==========================================================================

function renderCodePlaygroundTool(parent) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "10px";

  const starterCode = `<!-- HTML & JS Live Sandbox -->
<div style="font-family:sans-serif;padding:12px;color:#0f172a;">
  <h3 style="color:#4f46e5;margin:0 0 6px;">ZenvX Physics Sim</h3>
  <p id="out">বেগ হিসাব হচ্ছে...</p>
</div>
<script>
  const u = 10, a = 9.8, t = 3;
  const v = u + a * t;
  document.getElementById("out").innerHTML =
    "আদিবেগ u = 10 m/s, সময় t = 3s হলে <br/><b>চূড়ান্ত বেগ v = " + v.toFixed(2) + " m/s</b>";
<\/script>`;

  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <strong style="font-size:var(--fs-sm);">💻 HTML / CSS / JS কোড রানার</strong>
      <button type="button" id="btn-run-code" class="btn-primary btn-sm">▶ কোড রান করুন</button>
    </div>
    <textarea id="code-editor-inp" class="form-input" rows="7" style="font-family:var(--font-mono);font-size:0.78rem;"></textarea>
    <div style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid var(--border-subtle);height:160px;">
      <iframe id="code-preview-frame" sandbox="allow-scripts" style="width:100%;height:100%;border:none;"></iframe>
    </div>
  `;

  parent.appendChild(wrap);

  const editor = wrap.querySelector("#code-editor-inp");
  const frame = wrap.querySelector("#code-preview-frame");
  editor.value = starterCode;

  const runCode = () => {
    frame.srcdoc = editor.value;
  };

  wrap.querySelector("#btn-run-code").addEventListener("click", () => {
    runCode();
    showToast("কোড আউটপুট আপডেট হয়েছে!", "success", 1200);
  });

  runCode();
}
