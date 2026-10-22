// Světlý / tmavý režim: volba uživatele se pamatuje, bez volby se řídí systémem. Načítá se hned v <head>, aby stránka neblikla.
(function () {
  const KEY = "robosoutez-theme";
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;

  const current = () => root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  function paint(btn) {
    const dark = current() === "dark";
    btn.setAttribute("aria-label", dark ? "Přepnout na světlý režim" : "Přepnout na tmavý režim");
    btn.title = btn.getAttribute("aria-label");
    btn.querySelector(".sun").toggleAttribute("hidden", !dark);
    btn.querySelector(".moon").toggleAttribute("hidden", dark);
  }
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("themeBtn");
    if (!btn) return;
    paint(btn);
    btn.addEventListener("click", () => {
      const next = current() === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem(KEY, next); } catch (e) {}
      paint(btn);
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => paint(btn));
  });
})();
