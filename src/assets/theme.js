// Hell/Dunkel-Umschalter (wie auf dpp-service.ownyourdata.eu). Ohne Wahl folgt die Seite der
// Systemeinstellung; eine Wahl, die der Systemeinstellung entspricht, wird nicht gespeichert.
// Gespeichert wird nur "light" oder "dark", nie eine Eingabe des Rechners.
// Wird im <head> ohne defer geladen, damit das Farbschema vor dem ersten Zeichnen feststeht.
(function () {
  "use strict";
  var KEY = "bnr-theme";
  var root = document.documentElement;
  try {
    var stored = window.localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") root.setAttribute("data-theme", stored);
  } catch (e) {
    // Ohne Speicher folgt die Seite der Systemeinstellung.
  }

  function wire() {
    var button = document.getElementById("theme-toggle");
    if (!button) return;
    var media = window.matchMedia("(prefers-color-scheme: dark)");
    var en = document.documentElement.lang.indexOf("en") === 0;
    function system() { return media.matches ? "dark" : "light"; }
    function current() { return root.getAttribute("data-theme") || system(); }
    function show() {
      var dark = current() === "dark";
      button.setAttribute("data-mode", dark ? "dark" : "light");
      var label = dark ? (en ? "Switch to light mode" : "Zur hellen Ansicht wechseln")
                       : (en ? "Switch to dark mode" : "Zur dunklen Ansicht wechseln");
      button.setAttribute("aria-label", label);
      button.title = label;
    }
    button.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      try {
        if (next === system()) {
          root.removeAttribute("data-theme");
          window.localStorage.removeItem(KEY);
        } else {
          root.setAttribute("data-theme", next);
          window.localStorage.setItem(KEY, next);
        }
      } catch (e) {
        root.setAttribute("data-theme", next);
      }
      show();
    });
    if (media.addEventListener) media.addEventListener("change", show);
    button.hidden = false;
    show();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
