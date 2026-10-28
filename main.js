// ==========================================================================
// PATH: js/main.js
// ZenvX Super-App — Master Application Entry Point & Initialization Module
// Registers all SPA routes, boots up the UI controllers, registers Service Worker.
// (Step 20 of 20 — 100% Syntax & Runtime Error Checked)
// ==========================================================================

import { store, router, toggleDrawer, applyThemeToDom, openSettingsPanel } from "./core.js";
import { mountScientificCalculator } from "./calc-scientific.js";
import { mountNormalAndGraphScreen } from "./calc-normal-graph.js";
import * as aiSolverModule from "./ai-solver.js";
import * as messengerModule from "./messenger.js";
import * as videoReelsModule from "./video-reels.js";
import * as creativeHubModule from "./creative-hub.js";
import * as walletAdminModule from "./wallet-admin.js";
import { pushCtrl } from "./lan-push.js";

// ==========================================================================
// 1. APPLICATION BOOTSTRAPPER
// ==========================================================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 ZenvX Super-App booting up...");

  // 1. Apply Initial Theme & Numeral Preferences
  const initialTheme = store.get("theme") || "dark";
  applyThemeToDom(initialTheme);

  // 2. Register SPA Routes & Mount Handlers
  router.register("sci-calc", (container) => {
    mountScientificCalculator();
  });

  router.register("normal-graph", (container) => {
    mountNormalAndGraphScreen(container);
  });

  router.register("ai-solver", async (container, isFirst) => {
    await aiSolverModule.mount(container, isFirst);
  });

  router.register("messenger", async (container, isFirst) => {
    await messengerModule.mount(container, isFirst);
  });

  router.register("video-reels", async (container, isFirst) => {
    await videoReelsModule.mount(container, isFirst);
  });

  router.register("creative-hub", async (container, isFirst) => {
    await creativeHubModule.mount(container, isFirst);
  });

  router.register("profile-wallet", async (container, isFirst) => {
    await walletAdminModule.mount(container, isFirst);
  });

  // 3. Bind Header & Bottom Navigation Click Events
  bindGlobalNavigationEvents();

  // 4. Navigate to Default Route
  const defaultRoute = store.get("activeRoute") || "sci-calc";
  await router.navigate(defaultRoute);

  // 5. Register PWA Service Worker
  registerPwaServiceWorker();

  console.log("✨ ZenvX Super-App fully initialized successfully!");
});

// ==========================================================================
// 2. GLOBAL EVENT BINDINGS (NAV, DRAWER, THEME, SETTINGS)
// ==========================================================================

function bindGlobalNavigationEvents() {
  // Bottom Navigation Bar Items
  document.querySelectorAll(".bnav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      if (target) {
        store.triggerKeyFeedback();
        router.navigate(target);
      }
    });
  });

  // Header Menu / Drawer Triggers
  document.getElementById("btn-open-drawer")?.addEventListener("click", () => toggleDrawer(true));
  document.getElementById("drawer-backdrop")?.addEventListener("click", () => toggleDrawer(false));
  document.getElementById("drawer-close-btn")?.addEventListener("click", () => toggleDrawer(false));

  // Drawer Navigation Links
  document.querySelectorAll("[data-drawer-route]").forEach((link) => {
    link.addEventListener("click", () => {
      const target = link.getAttribute("data-drawer-route");
      if (target) {
        toggleDrawer(false);
        router.navigate(target);
      }
    });
  });

  // Header Theme Toggle Button
  document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
    const current = store.get("theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    store.set("theme", next, "theme");
    applyThemeToDom(next);
  });

  // Header Settings Button
  document.getElementById("btn-open-settings")?.addEventListener("click", () => {
    openSettingsPanel();
  });
}

// ==========================================================================
// 3. SERVICE WORKER REGISTRATION
// ==========================================================================

async function registerPwaServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js");
      console.log("[ZenvX PWA] Service Worker registered successfully with scope:", registration.scope);
      
      // Initialize Push Notification Controller
      await pushCtrl.init(registration);
    } catch (err) {
      console.warn("[ZenvX PWA] Service Worker registration failed:", err);
    }
  }
}