// Arbeitnehmerveranlagung (Schätzung). Der BMF-Brutto-Netto-Rechner rechnet sie nicht; die erwarteten
// Werte sind deshalb von Hand aus EStG 1988 und LStR 2002 hergeleitet (Rechenweg je Fall im Kommentar).
// Werte 2026: VAB 496, Zuschlag 804 (eingeschliffen 19.761–30.259), SV-Rückerstattung 55 %,
// höchstens 496 (mit Pendlerpauschale 750) plus Zuschlag, begrenzt mit der Steuer unter null (Rz 811);
// Kindermehrbetrag 700 je Kind minus Tarifsteuer (Rz 810a).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { berechne, zuschlagVerkehrsabsetzbetragJahr } from "../src/kern/rechner.js";

const w2026 = JSON.parse(readFileSync(new URL("../src/werte/2026.json", import.meta.url), "utf8"));
const basis = { bundesland: "niederoesterreich", pendler: null, alleinverdienerKinder: 0, familienbonus: [] };
const v = (e) => berechne(w2026, { ...basis, ...e }).veranlagung;

test("Zuschlag zum Verkehrsabsetzbetrag schleift ein", () => {
  assert.equal(zuschlagVerkehrsabsetzbetragJahr(w2026, 1976100), 80400);
  assert.equal(zuschlagVerkehrsabsetzbetragJahr(w2026, 3025900), 0);
  // 804 × (30.259 − 25.010) / 10.498 = 402,00
  assert.equal(zuschlagVerkehrsabsetzbetragJahr(w2026, 2501000), 40200);
});

test("2.000 €: Zuschlag zum VAB wird erstattet", () => {
  // Einkommen 12 × (2.000 − 302,40 − 11) = 20.239,20; Tarifsteuer (20.239,20 − 13.539) × 20 % = 1.340,04
  // Zuschlag 804 − 804 × 478,20 / 10.498 = 767,38; Steuer 1.340,04 − 496 − 767,38 = 76,66
  // Lohnsteuer laufend 12 × 70,34 = 844,08; Erstattung 844,08 − 76,66 = 767,42
  const r = v({ bruttoMonat: 200000 });
  assert.equal(r.einkommen, 2023920);
  assert.equal(r.tarifsteuer, 134004);
  assert.equal(r.zuschlagVerkehrsabsetzbetrag, 76738);
  assert.equal(r.einkommensteuer, 7666);
  assert.equal(r.gutschrift, 0);
  assert.equal(r.ergebnis, 76742);
});

test("1.200 €: SV-Rückerstattung inkl. SV-Bonus", () => {
  // Einkommen 12.090,72, Tarifsteuer 0; Steuer 0 − 496 − 804 = −1.300
  // 55 % von 12 × 181,44 = 1.197,50; Höchstbetrag 496 + 804 = 1.300; Gutschrift 1.197,50
  const r = v({ bruttoMonat: 120000 });
  assert.equal(r.tarifsteuer, 0);
  assert.equal(r.gutschrift, 119750);
  assert.equal(r.kindermehrbetrag, 0);
  assert.equal(r.ergebnis, 119750);
});

test("1.200 € alleinerziehend mit 1 Kind: AEAB-Gutschrift und Kindermehrbetrag", () => {
  // Steuer 0 − 496 − 804 − 612 = −1.912; Gutschrift min(1.912; 612 + 1.197,50) = 1.809,50
  // Kindermehrbetrag 700 − 0 = 700; zusammen 2.509,50
  const r = v({ bruttoMonat: 120000, alleinverdienerKinder: 1 });
  assert.equal(r.gutschrift, 180950);
  assert.equal(r.kindermehrbetrag, 70000);
  assert.equal(r.ergebnis, 250950);
});

test("1.300 € mit großer Pendlerpauschale 25 km: höherer Deckel 750 + Zuschlag", () => {
  // Einkommen 12 × (1.300 − 196,56 − 123 − 11) = 11.633,28, Tarifsteuer 0
  // Steuer 0 − 853 − 804 − 150 = −1.807; 55 % von 12 × 196,56 = 1.297,30 < 750 + 804; Gutschrift 1.297,30
  const r = v({ bruttoMonat: 130000, pendler: { art: "gross", km: 25 } });
  assert.equal(r.verkehrsabsetzbetrag, 85300);
  assert.equal(r.gutschrift, 129730);
  assert.equal(r.ergebnis, 129730);
});

test("Erstattung ist mit der Steuer unter null begrenzt", () => {
  // 1.500 €: Einkommen 12 × (1.500 − 226,80 − 11) = 15.146,40; Tarifsteuer 321,48
  // Steuer 321,48 − 496 − 804 = −978,52; 55 % von 12 × 226,80 = 1.496,88, Deckel 1.300 → begrenzt auf 978,52
  const r = v({ bruttoMonat: 150000 });
  assert.equal(r.tarifsteuer, 32148);
  assert.equal(r.gutschrift, 97852);
});

test("3.500 €: keine Veranlagungseffekte außer Rundung", () => {
  const r = v({ bruttoMonat: 350000 });
  assert.equal(r.zuschlagVerkehrsabsetzbetrag, 0);
  assert.equal(r.gutschrift, 0);
  assert.ok(Math.abs(r.ergebnis) <= 12, `Ergebnis ${r.ergebnis}`);
});

test("Kindermehrbetrag entfällt, wenn die Tarifsteuer 700 je Kind erreicht", () => {
  const r = v({ bruttoMonat: 300000, alleinverdienerKinder: 1, familienbonus: [{ alter: "4bis17", anteil: 100 }] });
  assert.ok(r.tarifsteuer >= 70000);
  assert.equal(r.kindermehrbetrag, 0);
});
