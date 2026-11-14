// headless chrome draws no cursor -> inject one so viewers can follow clicks
import type { Locator, Page } from "playwright";

import { alpha } from "../../src/kit/theme-color.ts";
import { project } from "../../src/project.ts";

const CURSOR_JS = `(() => {
  if (window.__fvCursor) return;
  const make = () => {
    if (!document.body || document.getElementById("__fv-cursor")) return;
    const style = document.createElement("style");
    style.textContent = \`
      #__fv-cursor{position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:none}
      #__fv-cursor svg{filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))}
      .__fv-ripple{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;z-index:2147483646;pointer-events:none;
        border:2px solid ${alpha(project.accent, 0.95)};background:${alpha(project.accent, 0.18)};animation:__fv-r .55s ease-out forwards}
      @keyframes __fv-r{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}\`;
    document.head.appendChild(style);
    const el = document.createElement("div");
    el.id = "__fv-cursor";
    el.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2.5v17.2l4.6-4.3 3 6.6 2.7-1.2-3-6.5h6.3z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.body.appendChild(el);
    const pos = window.__fvPos || { x: -100, y: -100 };
    el.style.transform = "translate(" + pos.x + "px," + pos.y + "px)";
  };
  window.__fvCursor = true;
  document.addEventListener("mousemove", (e) => {
    window.__fvPos = { x: e.clientX, y: e.clientY };
    make();
    const el = document.getElementById("__fv-cursor");
    if (el) el.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)";
  }, true);
  document.addEventListener("mousedown", (e) => {
    const r = document.createElement("div");
    r.className = "__fv-ripple";
    r.style.left = e.clientX + "px";
    r.style.top = e.clientY + "px";
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 600);
  }, true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", make); else make();
})();`;

export type Actor = ReturnType<typeof actor>;

export function actor(page: Page) {
  let pos = { x: 720, y: 450 };
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);

  async function moveTo(x: number, y: number) {
    const from = { ...pos };
    const steps = Math.max(12, Math.min(40, Math.round(Math.hypot(x - from.x, y - from.y) / 18)));
    for (let i = 1; i <= steps; i++) {
      const t = ease(i / steps);
      await page.mouse.move(from.x + (x - from.x) * t, from.y + (y - from.y) * t);
      await page.waitForTimeout(12);
    }
    pos = { x, y };
  }

  async function point(target: Locator) {
    await target.waitFor({ state: "visible" });
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const box = await target.boundingBox();
    if (!box) throw new Error(`no box for ${target}`);
    await moveTo(box.x + box.width / 2, box.y + box.height / 2);
  }

  return {
    async install() {
      await page.addInitScript(CURSOR_JS);
      await page.evaluate(CURSOR_JS).catch(() => {});
      await page.mouse.move(pos.x, pos.y);
    },
    point,
    async click(target: Locator, pause = 350) {
      await point(target);
      await page.waitForTimeout(120);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(pause);
    },
    async type(target: Locator, text: string, delay = 45) {
      await point(target);
      await page.mouse.down();
      await page.mouse.up();
      await target.fill("");
      await target.pressSequentially(text, { delay });
    },
    async fill(target: Locator, value: string) {
      await point(target);
      await page.mouse.down();
      await page.mouse.up();
      await target.fill(value);
    },
    async scrollTo(target: Locator) {
      await target.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
      await page.waitForTimeout(700);
    },
    pause: (ms: number) => page.waitForTimeout(ms),
  };
}
