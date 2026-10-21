# PWA agent

Jeden agent vlastní manifest, service worker, instalační tlačítko a zobrazení verze,
aby nevznikaly rozpory. Hotové šablony: `sablony/pwa/`.

## Povinné
1. **Tlačítko „Přidat na plochu“** vždy. Zachytit `beforeinstallprompt`.
   Na iOS (Safari tuto událost nemá) zobrazit krátký návod: Sdílet → Přidat na plochu.
   Tlačítko se skryje, pokud je aplikace už nainstalovaná.
2. **Automatická aktualizace po restartu aplikace.**
   Service worker používá `skipWaiting()` a `clients.claim()`, název cache obsahuje číslo verze,
   staré cache se při aktivaci mažou. Stránka se po převzetí novým workerem jednou obnoví.
3. **Číslo verze a datum aktualizace** viditelně v aplikaci (např. v patičce nebo v nastavení).
4. **Jediný zdroj verze:** `version.js` (`APP_VERSION`, `APP_DATE`). Načítá ho stránka i service worker.
   Nikdo jiný číslo neopisuje. Verzi zvyšuje při vydání release agent nebo koordinátor.

## Offline chování
- Aplikace musí bez internetu aspoň zobrazit základní obrazovku nebo stránku „Jste offline“.
- Statické soubory se berou ze sítě, při výpadku z cache.
- Požadavky na API se nekešují bez rozhodnutí koordinátora. Co se má ukázat offline, uveď do `STAV.md`.

## Aktualizace bez ztráty dat
- Data uživatele (localStorage, IndexedDB) se při aktualizaci nesmí mazat.
- Změna struktury uložených dat = migrace v kódu spojená s novým číslem verze
  (číslo verze dat se ukládá vedle dat).

## Ikony a vzhled
- Ikony 192×192 a 512×512 px, plus verze „maskable“. `theme-color` a `background_color` v manifestu.
- Responzivní vzhled, ovládání dotykem, dostatečný kontrast.

## Testování
- Testuje se na `http://localhost` (service worker tam funguje bez HTTPS), na produkci musí být HTTPS.
- Postup viz `docker-testy.md`.
- Ověř postupně: instalace → změna `version.js` → restart aplikace → nová verze je vidět a data zůstala.
