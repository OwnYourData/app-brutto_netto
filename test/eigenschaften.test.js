// Prüfungen, die der BMF-Rechner nicht abdeckt: 12 Bezüge, Drittel der Pendlerpauschale,
// Regeln ab 2027 und die Vollständigkeit der Werte-Dateien.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { berechne, bruttoAusNetto, rundeDiv, pendlerpauschaleMonat, pendlereuroJahr, avSatz } from "../src/kern/rechner.js";

const lade = (pfad) => JSON.parse(readFileSync(new URL(pfad, import.meta.url), "utf8"));
const w2026 = lade("../src/werte/2026.json");
const w2027 = lade("../src/werte/2027.json");
const basis = { bundesland: "niederoesterreich", pendler: null, alleinverdienerKinder: 0, familienbonus: [] };

test("kaufmännisches Runden", () => {
  assert.equal(rundeDiv(5, 10), 1);
  assert.equal(rundeDiv(4, 10), 0);
  assert.equal(rundeDiv(15, 10), 2);
  assert.equal(rundeDiv(-15, 10), -2);
});

test("12 Bezüge: keine Sonderzahlungen, Jahr = 12 × Monat", () => {
  const r = berechne(w2026, { ...basis, bruttoMonat: 400000, bezuege: 12 });
  assert.equal(r.bezug13, null);
  assert.equal(r.bezug14, null);
  assert.equal(r.jahressumme.netto, r.monat.netto * 12);
  const r14 = berechne(w2026, { ...basis, bruttoMonat: 400000 });
  assert.equal(r.monat.netto, r14.monat.netto);
});

test("Pendlerpauschale und Pendlereuro werden gedrittelt", () => {
  const voll = { art: "klein", km: 50 };
  assert.equal(pendlerpauschaleMonat(w2026, voll), 11300);
  assert.equal(pendlerpauschaleMonat(w2026, { ...voll, anteil: "zwei_drittel" }), 7533);
  assert.equal(pendlerpauschaleMonat(w2026, { ...voll, anteil: "ein_drittel" }), 3767);
  assert.equal(pendlereuroJahr(w2026, voll), 30000);
  assert.equal(pendlereuroJahr(w2026, { ...voll, anteil: "zwei_drittel" }), 20000);
});

test("Kilometergrenzen der Pendlerpauschale", () => {
  assert.equal(pendlerpauschaleMonat(w2026, { art: "klein", km: 19 }), 0);
  assert.equal(pendlerpauschaleMonat(w2026, { art: "klein", km: 20 }), 5800);
  assert.equal(pendlerpauschaleMonat(w2026, { art: "klein", km: 40 }), 5800);
  assert.equal(pendlerpauschaleMonat(w2026, { art: "klein", km: 41 }), 11300);
  assert.equal(pendlerpauschaleMonat(w2026, { art: "gross", km: 1 }), 0);
  assert.equal(pendlerpauschaleMonat(w2026, { art: "gross", km: 2 }), 3100);
  assert.equal(pendlerpauschaleMonat(w2026, { art: "gross", km: 61 }), 30600);
  assert.equal(pendlereuroJahr(w2026, { art: "klein", km: 15 }), 0, "ohne Pendlerpauschale kein Pendlereuro");
});

test("2027: Beginn des Dienstverhältnisses ist für die AV-Staffel anzugeben", () => {
  assert.throws(() => berechne(w2027, { ...basis, bruttoMonat: 200000 }), /vor oder ab/);
  assert.equal(avSatz(w2027, 200000, "vor"), 50);
  assert.equal(avSatz(w2027, 200000, "ab"), 100);
  assert.equal(avSatz(w2027, 260000, "vor"), 250);
  assert.equal(avSatz(w2027, 260000, "ab"), 295);
  assert.equal(avSatz(w2027, 280000, "vor"), 295);
});

test("2027: Familienbonus für Kinder ab 4 Jahren höchstens 75 %", () => {
  const mit = (kind) => berechne(w2027, { ...basis, beginn: "vor", bruttoMonat: 350000, familienbonus: [kind] });
  assert.throws(() => mit({ alter: "4bis17", anteil: 100 }), /nicht zulässig/);
  assert.equal(mit({ alter: "4bis17", anteil: 75 }).monat.details.familienbonusGenutzt, 12501);
  assert.equal(mit({ alter: "ab18", anteil: 75 }).monat.details.familienbonusGenutzt, 4376);
  assert.equal(mit({ alter: "unter4", anteil: 100 }).monat.details.familienbonusGenutzt, 16668);
  assert.equal(mit({ alter: "4bis17", anteil: 100, erhoehteFamilienbeihilfe: true }).monat.details.familienbonusGenutzt, 16668);
  assert.throws(() => berechne(w2026, { ...basis, bruttoMonat: 350000, familienbonus: [{ alter: "4bis17", anteil: 75 }] }), /nicht zulässig/);
});

test("Umkehrrechnung trifft das gewünschte Netto", () => {
  for (const netto of [100000, 180000, 250000, 400000, 900000]) {
    const r = bruttoAusNetto(w2026, { ...basis, nettoMonat: netto });
    assert.ok(r.monat.netto >= netto && r.monat.netto - netto <= 1, `Netto ${netto}: ${r.monat.netto}`);
  }
});

test("Ungültige Eingaben werden abgelehnt", () => {
  assert.throws(() => berechne(w2026, { ...basis, bruttoMonat: -1 }));
  assert.throws(() => berechne(w2026, { ...basis, bruttoMonat: 1.5 }));
  assert.throws(() => berechne(w2026, { ...basis, bruttoMonat: 100000, bezuege: 13 }));
  assert.throws(() => berechne(w2026, { ...basis, bruttoMonat: 100000, pendler: { art: "mittel", km: 30 } }));
});

for (const werte of [w2026, w2027]) {
  test(`Werte ${werte.jahr}: jede Quelle ist definiert`, () => {
    const verwendet = new Set();
    JSON.stringify(werte, (k, v) => { if (k === "quelle" || k === "grenzen_quelle") verwendet.add(v); return v; });
    for (const q of verwendet) assert.ok(werte.quellen[q], `Quelle ${q} fehlt`);
  });
}

for (const werte of [w2026, w2027]) {
  test(`Werte ${werte.jahr}: Status ist gesetzt, vorläufige Werte sind als offen dokumentiert`, () => {
    assert.ok(["amtlich", "vorlaeufig"].includes(werte.status), `unbekannter Status ${werte.status}`);
    const vorlaeufig = JSON.stringify(werte).includes('"vorlaeufig":true');
    if (werte.status === "amtlich") {
      assert.ok(!vorlaeufig, "amtliche Werte-Datei enthält vorläufige Werte");
    } else {
      assert.ok(Array.isArray(werte.offen) && werte.offen.length > 0, "vorläufige Werte-Datei ohne Liste 'offen'");
    }
  });
}
