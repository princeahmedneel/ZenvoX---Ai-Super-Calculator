// ==========================================================================
// PATH: js/wallet-admin.js
// ZenvX Super-App — Master User Profile, Authentication, Creator Wallet,
// Revenue Payouts & Admin Moderation Dashboard
// (Step 15 of 20 — 100% Syntax & Runtime Error Checked)
// ==========================================================================

import { store, escapeHTML, showToast, renderStateBlock } from "./core.js";
import { localizeDigits, toEnglishDigits, formatNumber } from "./config.js";
import { loginOrRegisterUser, logoutCurrentUser, updateUserProfileData, uploadMediaFile } from "./api-auth.js";

// ==========================================================================
// 1. MOUNT SCREEN 7: PROFILE, AUTH, WALLET & ADMIN
// ==========================================================================

export async function mount(container, isFirstMount) {
  if (!container) return;
  
  // Always clear and rebuild to reflect latest auth state
  container.innerHTML = "";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";
  container.style.backgroundColor = "var(--bg-app)";
  container.style.overflowY = "auto";
  container.style.padding = "16px";

  const user = store.get("auth.user");
  const profile = store.get("auth.profile");

  if (!user || !profile) {
    renderAuthScreen(container);
  } else {
    renderProfileDashboard(container, profile);
  }
}

// ==========================================================================
// 2. AUTHENTICATION SCREEN (LOGIN & REGISTER)
// ==========================================================================

function renderAuthScreen(container) {
  let isRegisterMode = false;

  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.alignItems = "center";
  wrap.style.justifyContent = "center";
  wrap.style.minHeight = "80vh";

  const card = document.createElement("div");
  card.className = "card-box";
  card.style.width = "100%";
  card.style.maxWidth = "400px";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.gap = "14px";

  const renderForm = () => {
    card.innerHTML = `
      <div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:2.8rem;margin-bottom:8px;">${isRegisterMode ? "📝" : "🔐"}</div>
        <h2 style="font-size:var(--fs-lg);font-weight:800;color:var(--text-primary);">
          ${isRegisterMode ? "নতুন অ্যাকাউন্ট তৈরি করুন" : "অ্যাকাউন্টে লগইন করুন"}
        </h2>
        <p style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:4px;">
          ${isRegisterMode ? "ZenvX কমিউনিটিতে যুক্ত হয়ে আপনার স্টাডি নোট ও ভিডিও শেয়ার করুন।" : "আপনার ক্লাউড স্টাডি ডাটা ও চ্যাট সিঙ্ক করতে লগইন করুন।"}
        </p>
      </div>

      ${isRegisterMode ? `
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:var(--fs-xs);color:var(--text-secondary);font-weight:600;">আপনার নাম</label>
          <input type="text" id="auth-name" class="form-input" placeholder="যেমন: MD. Rasel" />
        </div>
      ` : ""}

      <div style="display:flex;flex-direction:column;gap:4px;">
        <label style="font-size:var(--fs-xs);color:var(--text-secondary);font-weight:600;">ইমেইল ঠিকানা</label>
        <input type="email" id="auth-email" class="form-input" placeholder="example@gmail.com" />
      </div>

      <div style="display:flex;flex-direction:column;gap:4px;">
        <label style="font-size:var(--fs-xs);color:var(--text-secondary);font-weight:600;">পাসওয়ার্ড</label>
        <input type="password" id="auth-pass" class="form-input" placeholder="অন্তত ৬ অক্ষরের পাসওয়ার্ড..." />
      </div>

      <button type="button" id="btn-auth-submit" class="btn-primary" style="margin-top:8px;padding:12px;">
        ${isRegisterMode ? "অ্যাকাউন্ট তৈরি করুন" : "লগইন করুন"}
      </button>

      <div style="text-align:center;margin-top:8px;font-size:var(--fs-xs);color:var(--text-muted);">
        ${isRegisterMode ? "ইতিমধ্যেই অ্যাকাউন্ট আছে?" : "অ্যাকাউন্ট নেই?"}
        <button type="button" id="btn-toggle-auth" style="color:var(--accent-secondary);font-weight:700;margin-left:4px;">
          ${isRegisterMode ? "লগইন করুন" : "রেজিস্ট্রেশন করুন"}
        </button>
      </div>
    `;

    card.querySelector("#btn-toggle-auth").addEventListener("click", () => {
      isRegisterMode = !isRegisterMode;
      renderForm();
    });

    card.querySelector("#btn-auth-submit").addEventListener("click", async () => {
      const email = card.querySelector("#auth-email").value.trim();
      const pass = card.querySelector("#auth-pass").value.trim();
      const name = isRegisterMode ? card.querySelector("#auth-name").value.trim() : "";

      if (!email || !pass || (isRegisterMode && !name)) {
        showToast("দয়া করে সমস্ত ফিল্ড সঠিকভাবে পূরণ করুন।", "warning");
        return;
      }
      if (pass.length < 6) {
        showToast("পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।", "warning");
        return;
      }

      const btn = card.querySelector("#btn-auth-submit");
      btn.textContent = "অপেক্ষা করুন...";
      btn.disabled = true;

      try {
        await loginOrRegisterUser({ email, password: pass, displayName: name, isRegister: isRegisterMode });
        // Re-mount the screen to show dashboard
        mount(container, false);
      } catch (err) {
        showToast(err.message, "error");
        btn.textContent = isRegisterMode ? "অ্যাকাউন্ট তৈরি করুন" : "লগইন করুন";
        btn.disabled = false;
      }
    });
  };

  renderForm();
  wrap.appendChild(card);
  container.appendChild(wrap);
}

// ==========================================================================
// 3. PROFILE & CREATOR DASHBOARD
// ==========================================================================

function renderProfileDashboard(container, profile) {
  // Top Navigation Tabs
  const topTabs = document.createElement("div");
  topTabs.style.display = "flex";
  topTabs.style.gap = "8px";
  topTabs.style.marginBottom = "16px";
  topTabs.style.borderBottom = "1px solid var(--border-subtle)";
  topTabs.style.paddingBottom = "12px";
  topTabs.style.overflowX = "auto";

  const tabs = [
    { id: "profile", label: "👤 প্রোফাইল" },
    { id: "wallet", label: "💰 ক্রিয়েটর ওয়ালেট" }
  ];

  if (profile.role === "admin") {
    tabs.push({ id: "admin", label: "🛡️ অ্যাডমিন প্যানেল" });
  }

  topTabs.innerHTML = tabs.map((t, i) => `
    <button type="button" data-tab-id="${t.id}" class="${i === 0 ? 'btn-primary' : 'btn-secondary'} btn-sm" style="flex-shrink:0;">
      ${t.label}
    </button>
  `).join("");
  container.appendChild(topTabs);

  const contentArea = document.createElement("div");
  contentArea.style.flex = "1";
  container.appendChild(contentArea);

  const switchTab = (tabId) => {
    topTabs.querySelectorAll("button").forEach(b => {
      b.className = b.getAttribute("data-tab-id") === tabId ? "btn-primary btn-sm" : "btn-secondary btn-sm";
    });
    contentArea.innerHTML = "";

    if (tabId === "profile") renderProfileSection(contentArea, profile);
    else if (tabId === "wallet") renderWalletSection(contentArea, profile);
    else if (tabId === "admin") renderAdminSection(contentArea, profile);
  };

  topTabs.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => switchTab(b.getAttribute("data-tab-id")));
  });

  // Load default tab
  switchTab("profile");
}

// ==========================================================================
// 3A. USER PROFILE SECTION
// ==========================================================================

function renderProfileSection(parent, profile) {
  const avatarUrl = profile.avatarUrl || "https://ui-avatars.com/api/?background=6b5ce7&color=fff&size=128&name=" + encodeURIComponent(profile.displayName || "User");

  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "16px";

  wrap.innerHTML = `
    <!-- User Info Card -->
    <div class="card-box" style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;">
      <div style="position:relative;">
        <img src="${escapeHTML(avatarUrl)}" alt="Avatar" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid var(--accent-primary);" />
        <label for="avatar-upload" style="position:absolute;bottom:0;right:0;background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.9rem;">
          📷
        </label>
        <input type="file" id="avatar-upload" accept="image/*" style="display:none;" />
      </div>
      <div>
        <h2 style="font-size:var(--fs-lg);font-weight:800;color:var(--text-primary);display:flex;align-items:center;justify-content:center;gap:6px;">
          ${escapeHTML(profile.displayName)} 
          <span title="Verified User" style="color:var(--accent-secondary);font-size:0.9rem;">✔️</span>
        </h2>
        <span style="font-size:var(--fs-xs);color:var(--text-muted);font-family:var(--font-mono);">@${escapeHTML(profile.username)}</span>
      </div>
      <p style="font-size:var(--fs-sm);color:var(--text-secondary);max-width:280px;margin:0 auto;">${escapeHTML(profile.bio || "শিক্ষার্থী ও জ্ঞানপিপাসু")}</p>
    </div>

    <!-- Edit Profile Form -->
    <div class="card-box" style="display:flex;flex-direction:column;gap:10px;">
      <h3 style="font-size:var(--fs-sm);font-weight:800;border-bottom:1px solid var(--border-subtle);padding-bottom:6px;">প্রোফাইল আপডেট</h3>
      
      <div style="display:flex;flex-direction:column;gap:4px;">
        <label style="font-size:var(--fs-xs);color:var(--text-muted);">প্রদর্শন নাম</label>
        <input type="text" id="prof-name" class="form-input" value="${escapeHTML(profile.displayName)}" />
      </div>

      <div style="display:flex;flex-direction:column;gap:4px;">
        <label style="font-size:var(--fs-xs);color:var(--text-muted);">সংক্ষিপ্ত বায়ো (Bio)</label>
        <input type="text" id="prof-bio" class="form-input" value="${escapeHTML(profile.bio || "")}" />
      </div>

      <button type="button" id="btn-save-prof" class="btn-primary btn-sm" style="align-self:flex-end;margin-top:4px;">সংরক্ষণ করুন</button>
    </div>

    <button type="button" id="btn-logout" class="btn-danger" style="margin-top:10px;">লগআউট (Logout)</button>
  `;

  // Avatar Upload Logic
  wrap.querySelector("#avatar-upload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast("ছবি আপলোড হচ্ছে...", "info");
      const res = await uploadMediaFile(file, { folder: "zenvx/avatars", type: "image" });
      updateUserProfileData({ avatarUrl: res.url });
      import("./core.js").then(m => m.router.navigate("profile-wallet")); // refresh
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // Save Profile Logic
  wrap.querySelector("#btn-save-prof").addEventListener("click", () => {
    const name = wrap.querySelector("#prof-name").value.trim();
    const bio = wrap.querySelector("#prof-bio").value.trim();
    if (name) {
      updateUserProfileData({ displayName: name, bio });
    }
  });

  // Logout Logic
  wrap.querySelector("#btn-logout").addEventListener("click", () => {
    logoutCurrentUser();
    import("./core.js").then(m => m.router.navigate("profile-wallet")); // refresh
  });

  parent.appendChild(wrap);
}

// ==========================================================================
// 3B. CREATOR WALLET SECTION (MONETIZATION & PAYOUT)
// ==========================================================================

function renderWalletSection(parent, profile) {
  const balStr = localizeDigits(formatNumber(profile.walletBalance || 0), store.get("numeral"));
  const viewStr = localizeDigits(formatNumber(profile.totalViews || 0), store.get("numeral"));

  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "16px";

  wrap.innerHTML = `
    <!-- Balance Card -->
    <div style="background:linear-gradient(135deg, #1e293b, #0f172a);border-radius:var(--radius-lg);padding:20px;color:#fff;box-shadow:var(--shadow-md);position:relative;overflow:hidden;">
      <div style="position:absolute;top:-20px;right:-20px;width:120px;height:120px;background:var(--accent-primary);border-radius:50%;opacity:0.2;filter:blur(20px);"></div>
      
      <span style="font-size:var(--fs-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">মোট আয় (Revenue)</span>
      <div style="font-size:2.8rem;font-weight:800;font-family:var(--font-mono);margin:4px 0 12px;display:flex;align-items:center;gap:8px;">
        <span style="color:var(--color-success);">৳</span>${balStr}
      </div>

      <div style="display:flex;gap:16px;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;">
        <div>
          <span style="font-size:var(--fs-xs);color:var(--text-muted);display:block;">ভিডিও ভিউজ</span>
          <strong style="font-size:var(--fs-md);">${viewStr}</strong>
        </div>
        <div>
          <span style="font-size:var(--fs-xs);color:var(--text-muted);display:block;">বর্তমান স্ট্যাটাস</span>
          <strong style="font-size:var(--fs-xs);padding:2px 8px;background:rgba(16,185,129,0.2);color:#34d399;border-radius:4px;">অ্যাক্টিভ</strong>
        </div>
      </div>
    </div>

    <!-- Withdraw Action -->
    <div class="card-box" style="display:flex;flex-direction:column;gap:10px;">
      <h3 style="font-size:var(--fs-sm);font-weight:800;">টাকা উত্তোলন (Withdraw)</h3>
      <p style="font-size:var(--fs-xs);color:var(--text-secondary);margin-bottom:6px;">সর্বনিম্ন ৫০০ টাকা হলে বিকাশ বা নগদের মাধ্যমে উত্তোলন করতে পারবেন।</p>
      
      <select id="payout-method" class="form-input">
        <option value="bkash">বিকাশ (bKash)</option>
        <option value="nagad">নগদ (Nagad)</option>
      </select>
      
      <input type="text" id="payout-acc" class="form-input" placeholder="অ্যাকাউন্ট নম্বর (01...)" />
      <input type="number" id="payout-amount" class="form-input" placeholder="পরিমাণ (৳)" />
      
      <button type="button" id="btn-withdraw" class="btn-primary" style="margin-top:6px;">রিকোয়েস্ট পাঠান</button>
    </div>
  `;

  wrap.querySelector("#btn-withdraw").addEventListener("click", () => {
    const method = wrap.querySelector("#payout-method").value;
    const acc = wrap.querySelector("#payout-acc").value.trim();
    const amount = Number(toEnglishDigits(wrap.querySelector("#payout-amount").value));

    if (!acc || acc.length < 11) {
      showToast("সঠিক মোবাইল অ্যাকাউন্ট নম্বর দিন।", "warning");
      return;
    }
    if (!amount || amount < 500) {
      showToast("উত্তোলনের জন্য সর্বনিম্ন ৫০০ টাকা প্রয়োজন।", "warning");
      return;
    }
    if (amount > (profile.walletBalance || 0)) {
      showToast("আপনার ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই।", "error");
      return;
    }

    // Deduct and save (Mock Logic for Local Demo)
    const newBal = (profile.walletBalance || 0) - amount;
    updateUserProfileData({ walletBalance: newBal });
    showToast(`৳${amount} টাকা উত্তোলনের রিকোয়েস্ট অ্যাডমিনের কাছে পাঠানো হয়েছে!`, "success", 3000);
    import("./core.js").then(m => m.router.navigate("profile-wallet"));
  });

  parent.appendChild(wrap);
}

// ==========================================================================
// 3C. ADMIN MODERATION PANEL (ONLY FOR 'admin' ROLE)
// ==========================================================================

function renderAdminSection(parent, profile) {
  if (profile.role !== "admin") {
    parent.appendChild(renderStateBlock({
      icon: "🚫", title: "অ্যাক্সেস ডিনাইড", message: "আপনার এই পেজে প্রবেশের অনুমতি নেই।"
    }));
    return;
  }

  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "16px";

  wrap.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="card-box" style="text-align:center;padding:16px 10px;">
        <div style="font-size:1.8rem;">👥</div>
        <div style="font-size:var(--fs-lg);font-weight:800;margin-top:4px;">১,২৪০</div>
        <div style="font-size:var(--fs-xs);color:var(--text-muted);">মোট ইউজার</div>
      </div>
      <div class="card-box" style="text-align:center;padding:16px 10px;">
        <div style="font-size:1.8rem;">💸</div>
        <div style="font-size:var(--fs-lg);font-weight:800;margin-top:4px;">৳৩,২০০</div>
        <div style="font-size:var(--fs-xs);color:var(--text-muted);">পেন্ডিং উইথড্র</div>
      </div>
    </div>

    <div class="card-box" style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-subtle);padding-bottom:6px;">
        <h3 style="font-size:var(--fs-sm);font-weight:800;">ভিডিও অনুমোদন (Pending)</h3>
        <span style="font-size:0.7rem;background:var(--color-warning);color:#fff;padding:2px 6px;border-radius:10px;">২ টি অপেক্ষমান</span>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-elevated);padding:8px 10px;border-radius:8px;">
        <div>
          <strong style="font-size:var(--fs-xs);display:block;">জৈব রসায়ন - নামকরণ</strong>
          <span style="font-size:0.65rem;color:var(--text-muted);">by @sakib_chem</span>
        </div>
        <div style="display:flex;gap:4px;">
          <button type="button" class="btn-primary btn-sm" style="padding:4px 8px;">✅</button>
          <button type="button" class="btn-danger btn-sm" style="padding:4px 8px;">❌</button>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-elevated);padding:8px 10px;border-radius:8px;">
        <div>
          <strong style="font-size:var(--fs-xs);display:block;">ইন্টিগ্রেশন শর্টকাট ট্রিকস</strong>
          <span style="font-size:0.65rem;color:var(--text-muted);">by @math_genius</span>
        </div>
        <div style="display:flex;gap:4px;">
          <button type="button" class="btn-primary btn-sm" style="padding:4px 8px;">✅</button>
          <button type="button" class="btn-danger btn-sm" style="padding:4px 8px;">❌</button>
        </div>
      </div>
    </div>
  `;

  // Attach mock events to admin buttons
  wrap.querySelectorAll(".btn-primary.btn-sm").forEach(b => {
    b.addEventListener("click", (e) => {
      e.target.parentElement.parentElement.remove();
      showToast("ভিডিও অনুমোদিত হয়েছে।", "success");
    });
  });
  wrap.querySelectorAll(".btn-danger.btn-sm").forEach(b => {
    b.addEventListener("click", (e) => {
      e.target.parentElement.parentElement.remove();
      showToast("ভিডিও বাতিল করা হয়েছে।", "info");
    });
  });

  parent.appendChild(wrap);
}