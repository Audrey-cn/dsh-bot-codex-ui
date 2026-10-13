// Generated from src/client by scripts/build-client.mjs. Do not edit by hand.
window.__ModuleLoader__.load({
  id: 'dsh-bot-codex-ui',
  factory: (require) => {
const module = { exports: {} }
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.js
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
function runSelfCheck() {
  const issues = [];
  const card = document.querySelector("[data-composer-card]");
  if (card) {
    const row = card.querySelector('[class*="_row"]');
    if (!row) {
      issues.push("composer row wrapper not found — upstream may have changed the structure");
    } else {
      const display = getComputedStyle(row).display;
      if (display === "contents") {
        issues.push("composer row is display:contents — the structural fix is not applying");
      }
    }
  }
  const foot = document.querySelector(".dcu-foot");
  if (foot) {
    const display = getComputedStyle(foot).display;
    if (display !== "flex") {
      issues.push('sidebar footer is "' + display + '" instead of flex — the footer fix is not applying');
    }
  }
  const badge = document.querySelector(".bt-connect-warn");
  if (badge && getComputedStyle(badge).display !== "none") {
    issues.push("the red warning badge is still visible");
  }
  const tabs = document.querySelector(".bt-mode-tabs, .bsf-mode-tabs");
  const footerSlot = document.querySelector(".dcu-footer-actions");
  if (footerSlot && !tabs) {
    issues.push("mode tabs not rendered — the sidebar footer slot may have changed");
  }
  const label = document.querySelector('.dcu-settings-seat [class*="_label"]');
  if (label && getComputedStyle(label).display !== "none") {
    issues.push("the account name label is still visible (expected a single icon)");
  }
  if (issues.length === 0) {
    console.log("[dsh-bot-codex-ui] self-check passed — all layout fixes are active");
    return;
  }
  console.warn("[dsh-bot-codex-ui] self-check found issues:\n  " + issues.join("\n  "));
  surfaceWarning(issues);
}
function surfaceWarning(issues) {
  const el = document.createElement("div");
  el.className = "bot-codex-ui-warn";
  el.setAttribute("role", "alert");
  el.style.cssText = [
    "position:fixed",
    "bottom:16px",
    "right:16px",
    "z-index:99999",
    "max-width:380px",
    "padding:10px 14px",
    "border-radius:10px",
    "background:#b91c1c",
    "color:#fff",
    "font-size:12px",
    "line-height:18px",
    "box-shadow:0 4px 12px rgba(0,0,0,.3)",
    "cursor:pointer",
    "white-space:pre-wrap"
  ].join(";");
  el.textContent = "dsh-bot-codex-ui: some layout fixes are not applying.\n" + issues.join("\n") + "\n(click to dismiss)";
  el.addEventListener("click", () => el.remove());
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2e4);
}
var inject = [];
function apply(ctx) {
  const timer = setTimeout(runSelfCheck, 2e3);
  ctx.effect(() => () => clearTimeout(timer), "dsh-bot-codex-ui: self-check");
}
return Object.defineProperty({ ...module.exports }, Symbol.toStringTag, { value: 'Module' })
  },
})
