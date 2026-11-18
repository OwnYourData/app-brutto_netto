// Abgleich mit dem Brutto-Netto-Rechner des BMF: höchstens 1 Cent Abweichung je Wert.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { berechne, bruttoAusNetto } from "../src/kern/rechner.js";

const lade = (pfad) => JSON.parse(readFileSync(new URL(pfad, import.meta.url), "utf8"));
const werte2026 = lade("../src/werte/2026.json");
const referenz = lade("./referenz-2026.json");

const cent = (euro) => Math.round(euro * 100);

function nahe(ist, sollEuro, was) {
  const soll = cent(sollEuro);
  assert.ok(Math.abs(ist - soll) <= 1, `${was}: ${(ist / 100).toFixed(2)} statt ${sollEuro.toFixed(2)}`);
}

function eingabenAus(fall) {
  const e = fall.eingaben;
  return {
    bundesland: e.bundesland,
    pendler: e.pendler ?? null,
    alleinverdienerKinder: e.alleinverdienerKinder ?? 0,
    familienbonus: e.familienbonus ?? []
  };
}

for (const fall of referenz.faelle) {
  test(`BMF 2026, Fall ${fall.id}: ${fall.titel}`, () => {
    const basis = eingabenAus(fall);
    const r = fall.eingaben.netto !== undefined
      ? bruttoAusNetto(werte2026, { ...basis, nettoMonat: cent(fall.eingaben.netto) })
      : berechne(werte2026, { ...basis, bruttoMonat: cent(fall.eingaben.brutto) });
    const s = fall.erwartet;
    const bezuege = [r.monat, r.bezug13, r.bezug14];
    const namen = ["Monat", "13. Bezug", "14. Bezug"];
    if (s.brutto !== undefined) nahe(r.monat.brutto, s.brutto, "Brutto");
    for (let i = 0; i < 3; i++) {
      nahe(bezuege[i].sozialversicherung, s.sv[i], `SV ${namen[i]}`);
      nahe(bezuege[i].lohnsteuer, s.lst[i], `LSt ${namen[i]}`);
      if (s.netto[i] !== null) nahe(bezuege[i].netto, s.netto[i], `Netto ${namen[i]}`);
    }
    nahe(r.jahressumme.netto, s.nettoJahr, "Netto Jahr");
    if (s.familienbonus !== undefined) nahe(r.monat.details.familienbonusGenutzt, s.familienbonus, "Familienbonus genutzt");
    if (s.pendlerpauschale !== undefined) nahe(r.monat.details.pendlerpauschale, s.pendlerpauschale, "Pendlerpauschale");
    if (s.verkehrsabsetzbetragJahr !== undefined) nahe(r.monat.details.verkehrsabsetzbetragJahr, s.verkehrsabsetzbetragJahr, "Verkehrsabsetzbetrag");
  });
}
