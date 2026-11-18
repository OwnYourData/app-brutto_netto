// Nachweis im echten Browser (Chromium über Playwright):
// ohne Zustimmung geht keine einzige Anfrage an Google oder sonst nach außen,
// und eingegebene Werte verlassen die Seite auch mit Zustimmung nie.
//
// Anfragen an Google werden im Test abgefangen und mit einem leeren Skript beantwortet;
// es erreicht also nie eine Anfrage Google. Gezählt wird jeder Versuch des Browsers.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { starteServer } from "./server.mjs";

const TEST_CONFIG = { id: "AW-123456789", conversions: { github: "TestGithub", berechnung: "TestBerechnung" } };
const BETRAG = "4321";
const GOOGLE = /(^|\.)(google|googletagmanager|googleadservices|doubleclick|gstatic)\.[a-z.]+$/;

let browser;
before(async () => {
  const optionen = {};
  if (process.env.CHROME_PATH) optionen.executablePath = process.env.CHROME_PATH;
  if (process.getuid?.() === 0) optionen.chromiumSandbox = false; // nur in Containern, die als root laufen
  browser = await chromium.launch(optionen);
});
after(async () => { await browser?.close(); });

// Öffnet eine Seite, protokolliert jede Anfrage nach außen und beantwortet sie, ohne das Netz zu erreichen.
async function oeffne(server, pfad = "/") {
  const context = await browser.newContext();
  const aussen = [];
  const cspFehler = [];
  await context.route((url) => !url.href.startsWith(server.url), (route) => {
    const r = route.request();
    aussen.push({ url: r.url(), host: new URL(r.url()).hostname, navigation: r.isNavigationRequest(), post: r.postData() || "" });
    if (GOOGLE.test(new URL(r.url()).hostname) && r.resourceType() === "script") {
      return route.fulfill({ status: 200, contentType: "application/javascript", body: "/* Test: gtag.js ersetzt */" });
    }
    return route.abort();
  });
  const page = await context.newPage();
  page.on("console", (m) => { if (/Content Security Policy/i.test(m.text())) cspFehler.push(m.text()); });
  await page.goto(server.url + pfad);
  await page.waitForLoadState("networkidle");
  return { context, page, aussen, cspFehler };
}

// Was eine Person auf der Seite typischerweise tut: Betrag ändern, Kind, Pendeln, Quellcode-Link anklicken.
// Der Klick auf den Link wird nach den Handlern der Seite abgefangen, damit der Browser die Seite nicht verlässt.
async function benutze(page) {
  await page.fill("#betrag", BETRAG);
  await page.click("#kind-dazu");
  await page.check("#pendeln");
  await page.fill("#km", "35");
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    for (const a of document.querySelectorAll('a[href^="https://github.com/"]')) a.addEventListener("click", (e) => e.preventDefault());
  });
  await page.locator('#warum a[href^="https://github.com/OwnYourData/"]').click();
  await page.waitForTimeout(300);
}

const googleAnfragen = (aussen) => aussen.filter((a) => GOOGLE.test(a.host));
const sonstige = (aussen) => aussen.filter((a) => !GOOGLE.test(a.host));

test("Ohne Conversion-ID: kein Banner, keine einzige Anfrage nach außen (alle Seiten)", async () => {
  const server = await starteServer();
  try {
    for (const pfad of ["/", "/en/", "/datenschutz/", "/en/privacy/"]) {
      const { context, page, aussen, cspFehler } = await oeffne(server, pfad);
      if (pfad === "/" || pfad === "/en/") await benutze(page);
      assert.equal(await page.locator(".consent").count(), 0, `${pfad}: Banner sichtbar`);
      assert.equal(await page.locator("[data-consent-settings]:visible").count(), 0, `${pfad}: Einwilligungs-Link sichtbar`);
      assert.deepEqual(googleAnfragen(aussen), [], `${pfad}: Anfrage an Google`);
      assert.deepEqual(sonstige(aussen), [], `${pfad}: Anfrage nach außen`);
      assert.deepEqual(cspFehler, [], `${pfad}: CSP-Verstoß`);
      await context.close();
    }
  } finally { await server.close(); }
});

test("Mit Conversion-ID, noch keine Entscheidung: Banner, aber keine Anfrage an Google", async () => {
  const server = await starteServer({ csp: "ads", consentConfig: TEST_CONFIG });
  try {
    const { context, page, aussen } = await oeffne(server);
    assert.equal(await page.locator(".consent").isVisible(), true);
    const knoepfe = page.locator(".consent-actions button");
    const [ablehnen, zustimmen] = [await knoepfe.nth(0).boundingBox(), await knoepfe.nth(1).boundingBox()];
    assert.equal(Math.round(ablehnen.width), Math.round(zustimmen.width), "Ablehnen gleich prominent wie Zustimmen");
    await benutze(page);
    assert.deepEqual(googleAnfragen(aussen), []);
    assert.deepEqual(sonstige(aussen), []);
    await context.close();
  } finally { await server.close(); }
});

test("Abgelehnt: keine Anfrage an Google, auch nach neuem Laden", async () => {
  const server = await starteServer({ csp: "ads", consentConfig: TEST_CONFIG });
  try {
    const { context, page, aussen } = await oeffne(server);
    await page.click('.consent button[data-choice="decline"]');
    await benutze(page);
    await page.reload();
    await page.waitForLoadState("networkidle");
    assert.equal(await page.locator(".consent").isVisible().catch(() => false), false, "Banner nach Ablehnen wieder da");
    await benutze(page);
    assert.deepEqual(googleAnfragen(aussen), []);
    assert.deepEqual(sonstige(aussen), []);
    await context.close();
  } finally { await server.close(); }
});

test("Zugestimmt: Tag wird geladen, Conversions ohne eingegebene Werte", async () => {
  const server = await starteServer({ csp: "ads", consentConfig: TEST_CONFIG });
  try {
    const { context, page, aussen, cspFehler } = await oeffne(server);
    assert.deepEqual(googleAnfragen(aussen), [], "vor der Zustimmung");
    await page.click('.consent button[data-choice="accept"]');
    await page.waitForTimeout(200);
    await benutze(page);
    const tag = googleAnfragen(aussen).filter((a) => a.url.startsWith("https://www.googletagmanager.com/gtag/js?id=AW-123456789"));
    assert.equal(tag.length, 1, "gtag.js genau einmal geladen");
    const ereignisse = await page.evaluate(() => JSON.stringify(Array.from(window.dataLayer || [], (a) => Array.from(a))));
    const conversions = JSON.parse(ereignisse).filter((e) => e[0] === "event" && e[1] === "conversion").map((e) => e[2].send_to);
    assert.deepEqual(conversions, ["AW-123456789/TestBerechnung", "AW-123456789/TestGithub"]);
    assert.ok(!ereignisse.includes(BETRAG), "eingegebener Betrag im dataLayer");
    for (const a of aussen) assert.ok(!a.url.includes(BETRAG) && !a.post.includes(BETRAG), `Betrag in Anfrage ${a.url}`);
    assert.deepEqual(cspFehler, []);
    await context.close();
  } finally { await server.close(); }
});

test("Widerruf über „Einwilligung ändern“: danach keine Anfrage an Google mehr", async () => {
  const server = await starteServer({ csp: "ads", consentConfig: TEST_CONFIG });
  try {
    const { context, page, aussen } = await oeffne(server);
    await page.click('.consent button[data-choice="accept"]');
    await page.click("footer [data-consent-settings]");
    await Promise.all([page.waitForEvent("load"), page.click('.consent button[data-choice="decline"]')]);
    await page.waitForLoadState("networkidle");
    const vorher = googleAnfragen(aussen).length;
    await benutze(page);
    assert.equal(googleAnfragen(aussen).length, vorher, "nach dem Widerruf weitere Anfragen an Google");
    await context.close();
  } finally { await server.close(); }
});

test("Strikte CSP sperrt Google auch bei eingetragener ID (Sicherung gegen Fehlkonfiguration)", async () => {
  const server = await starteServer({ csp: "strict", consentConfig: TEST_CONFIG });
  try {
    const { context, page, aussen, cspFehler } = await oeffne(server);
    await page.click('.consent button[data-choice="accept"]');
    await benutze(page);
    assert.deepEqual(googleAnfragen(aussen), [], "Anfrage an Google trotz strikter CSP");
    assert.ok(cspFehler.length > 0, "CSP hätte das Tag sperren müssen");
    await context.close();
  } finally { await server.close(); }
});
