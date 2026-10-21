// Registrace service workeru, tlačítko „Přidat na plochu“, zobrazení verze.
(function () {
  const btn = document.getElementById("installBtn");
  const hint = document.getElementById("iosHint");
  const ver = document.getElementById("verze");

  if (ver && typeof APP_VERSION !== "undefined") {
    ver.textContent = "Verze " + APP_VERSION + " · aktualizace " + APP_DATE;
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
