// Google-Ads-Conversion-Messung (docs/Consent.md).
//
// Ohne gültige ID ist die Funktion aus: kein Banner, kein Skript, keine Anfrage an Google.
// Eine Conversion ohne gültiges Label wird nicht gemessen; die anderen schon.
// Die ID steht ohnehin im Quelltext jeder Seite, die das Tag lädt; sie ist kein Geheimnis.
//
//   id                      AW-<Ziffern>, die Conversion-ID des Google-Ads-Kontos
//   conversions.github      Klick auf den Quellcode bei GitHub (primäre Conversion)
//   conversions.berechnung  erste selbst ausgelöste Berechnung je Seitenaufruf (sekundär, nicht für Gebote)
export default {
  id: "",
  conversions: {
    github: "",
    berechnung: ""
  }
};
