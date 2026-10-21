// Registrace service workeru, tlačítko „Přidat na plochu“, zobrazení verze.
(function () {
  const btn = document.getElementById("installBtn");
  const hint = document.getElementById("iosHint");
  const ver = document.getElementById("verze");

  if (typeof APP_VERSION !== "undefined") {
    const d = APP_DATE.split("-").map(Number), datum = d[2] + ". " + d[1] + ". " + d[0];
    const text = "verze " + APP_VERSION + " · " + datum;
    if (ver) ver.textContent = text;
    const ver2 = document.getElementById("verze2"), appver = document.getElementById("appver");
    if (ver2) ver2.textContent = "RoboSoutěž 2026 · " + text;
    if (appver) appver.textContent = "v" + APP_VERSION;
  }

  const installed =
    window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    if (btn && !installed) btn.hidden = false;
  });
  if (btn) {
    btn.addEventListener("click", async () => {
      if (!deferred) return;
      deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      btn.hidden = true;
    });
  }
  window.addEventListener("appinstalled", () => { if (btn) btn.hidden = true; });

  // iOS Safari nemá beforeinstallprompt, ukážeme návod.
  if (isIOS && !installed && hint) hint.hidden = false;

  if ("serviceWorker" in navigator) {
    // Nový worker převezme řízení a stránka se jednou obnoví.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded || !navigator.serviceWorker.controller) return;
      reloaded = true;
      location.reload();
    });
    navigator.serviceWorker.register("sw.js").then((reg) => reg.update());
  }
})();
