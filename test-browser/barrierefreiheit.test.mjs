// Barrierefreiheit: axe-core prüft alle Seiten nach WCAG 2.1 A und AA, hell und dunkel,
// auch mit sichtbarem Einwilligungs-Banner. Jede Verletzung lässt den Test scheitern.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { starteServer } from "./server.mjs";

const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const SEITEN = ["/", "/en/", "/datenschutz/", "/en/privacy/"];

let browser;
before(async () => {
  const optionen = {};
  if (process.env.CHROME_PATH) optionen.executablePath = process.env.CHROME_PATH;
  if (process.getuid?.() === 0) optionen.chromiumSandbox = false;
  browser = await chromium.launch(optionen);
});
after(async () => { await browser?.close(); });

async function pruefe(server, pfad, farbschema, vorbereitung) {
  // bypassCSP nur, damit axe selbst in die Seite geladen werden kann; die Seite ist unverändert.
  const context = await browser.newContext({ colorScheme: farbschema, bypassCSP: true });
  await context.route((url) => !url.href.startsWith(server.url), (route) => route.abort());
  const page = await context.newPage();
  await page.goto(server.url + pfad);
  await page.waitForLoadState("networkidle");
  if (vorbereitung) await vorbereitung(page);
  await page.evaluate(AXE);
  const ergebnis = await page.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
  await context.close();
  return ergebnis.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
}

for (const farbschema of ["light", "dark"]) {
  test(`WCAG 2.1 AA, ${farbschema === "light" ? "hell" : "dunkel"}: alle Seiten ohne Verletzung`, async () => {
    const server = await starteServer();
    try {
      for (const pfad of SEITEN) {
        const verletzungen = await pruefe(server, pfad, farbschema, async (page) => {
          if (pfad === "/" || pfad === "/en/") {
            await page.click("#kind-dazu");
            await page.check("#pendeln");
            await page.fill("#betrag", "1200");
            await page.waitForTimeout(200);
          }
        });
        assert.deepEqual(verletzungen, [], `${pfad}`);
      }
    } finally { await server.close(); }
  });
}

test("WCAG 2.1 AA: Seite mit sichtbarem Einwilligungs-Banner", async () => {
  const server = await starteServer({ csp: "ads", consentConfig: { id: "AW-123456789", conversions: { github: "Test" } } });
  try {
    for (const pfad of ["/", "/en/"]) {
      const verletzungen = await pruefe(server, pfad, "light");
      assert.deepEqual(verletzungen, [], `${pfad}`);
    }
  } finally { await server.close(); }
});
